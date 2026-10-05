import { NextRequest, NextResponse } from 'next/server';
import { getDb, isDbConfigured, q } from '@/lib/db';
import { transcribeBase64 } from '@/lib/services/transcription';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const execFileAsync = promisify(execFile);

// Сырой размер одного чанка: base64 inflation 4/3 → тело запроса ~3.4 МБ < лимита Vercel (4.5 МБ)
const MAX_CHUNK_RAW = Math.floor(2.5 * 1024 * 1024);
// Длительность одной части для транскрибации. 15 мин при 64 kbps ≈ 7.2 МБ < лимита Whisper
const PART_SECONDS = 900;

function resolveFfmpeg(): string {
  // Путь считаем через fs, а не require — чтобы webpack не лез в бинарник,
  // а файл попал в функцию через experimental.outputFileTracingIncludes
  const root = process.cwd();
  const platformPkg = `${process.platform}-${process.arch}`;
  const bin = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const candidates = [
    path.join(root, 'node_modules', '@ffmpeg-installer', platformPkg, bin),
    path.join(root, 'node_modules', 'ffmpeg-static', bin),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error(`ffmpeg binary not found. Looked in: ${candidates.join(', ')}`);
}

let cachedFfmpeg: string | null = null;
function ffmpegBin(): string {
  if (!cachedFfmpeg) {
    const bin = resolveFfmpeg();
    try {
      fs.chmodSync(bin, 0o755);
    } catch {}
    cachedFfmpeg = bin;
  }
  return cachedFfmpeg;
}

async function runFfmpeg(args: string[]): Promise<string> {
  try {
    const { stderr } = await execFileAsync(ffmpegBin(), args, {
      maxBuffer: 32 * 1024 * 1024,
      timeout: 120_000,
    });
    return stderr || '';
  } catch (e: any) {
    const msg = String(e?.stderr || e?.message || e);
    throw new Error(`ffmpeg failed: ${msg.slice(0, 500)}`);
  }
}

function parseDuration(stderr: string): number {
  const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
}

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const sql = getDb();

  try {
    const body = await req.json();
    const { action, lessonId, index, data, filename } = body;

    if (!lessonId || typeof lessonId !== 'string') {
      return NextResponse.json({ error: 'lessonId required' }, { status: 400 });
    }

    const lessonRows = await q(sql, sql`SELECT id, duration_seconds FROM lessons WHERE id = ${lessonId} LIMIT 1`);
    if (!lessonRows.length) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

    // ---------- chunk: сохраняем кусок файла в БД (переживает разные инстансы Vercel) ----------
    if (action === 'chunk') {
      if (typeof data !== 'string' || !data.length) {
        return NextResponse.json({ error: 'No data' }, { status: 400 });
      }
      if (data.length > Math.ceil((MAX_CHUNK_RAW * 4) / 3) + 64) {
        return NextResponse.json({ error: 'Chunk too large' }, { status: 413 });
      }
      const idx = Number(index);
      if (!Number.isInteger(idx) || idx < 0 || idx > 10000) {
        return NextResponse.json({ error: 'Bad index' }, { status: 400 });
      }

      await q(
        sql,
        sql`INSERT INTO dev_upload_chunks (lesson_id, idx, data) VALUES (${lessonId}, ${idx}, decode(${data}, 'base64'))
            ON CONFLICT (lesson_id, idx) DO UPDATE SET data = EXCLUDED.data, created_at = now()`
      );
      return NextResponse.json({ ok: true, index: idx });
    }

    // ---------- finalize: собираем файл, режем, транскрибируем, кладём в staging ----------
    if (action === 'finalize') {
      const existing = await q(sql, sql`SELECT id FROM lesson_audio_segments WHERE lesson_id = ${lessonId} LIMIT 1`);
      if (existing.length) {
        return NextResponse.json({ error: 'Урок уже загружен и транскрибирован' }, { status: 409 });
      }

      const chunkRows = await q(
        sql,
        sql`SELECT idx, encode(data, 'base64') as b64 FROM dev_upload_chunks WHERE lesson_id = ${lessonId} ORDER BY idx ASC`
      );
      if (!chunkRows.length) return NextResponse.json({ error: 'Нет загруженных данных' }, { status: 400 });

      const buffers = chunkRows.map((r: any) => Buffer.from(r.b64, 'base64'));
      const fileBuf = Buffer.concat(buffers);

      const extMatch = typeof filename === 'string' ? filename.match(/\.([A-Za-z0-9]{1,6})$/) : null;
      const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '.bin';

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devup-'));
      const inputPath = path.join(tmpDir, `input${ext}`);
      fs.writeFileSync(inputPath, fileBuf);

      try {
        // 1. Длительность исходника (ffmpeg сам определит контейнер/кодек)
        const header = await runFfmpeg(['-i', inputPath, '-t', '0.001', '-f', 'null', '-']);
        const durationSec = parseDuration(header);
        if (!durationSec || durationSec < 2) {
          throw new Error('Не удалось прочитать аудио из файла — проверьте формат');
        }

        // 2. Режем на части, транскрибируем каждую (язык определяет Whisper сам)
        const partCount = Math.max(1, Math.ceil(durationSec / PART_SECONDS));
        let totalSegments = 0;

        for (let i = 0; i < partCount; i++) {
          const partPath = path.join(tmpDir, `part_${i}.mp3`);
          const offset = i * PART_SECONDS;

          await runFfmpeg([
            '-y',
            '-ss', String(offset),
            '-t', String(PART_SECONDS),
            '-i', inputPath,
            '-vn',
            '-ac', '1',
            '-ar', '16000',
            '-b:a', '64k',
            '-map_metadata', '-1',
            '-f', 'mp3',
            partPath,
          ]);

          const partB64 = fs.readFileSync(partPath).toString('base64');
          const result = await transcribeBase64(`data:audio/mpeg;base64,${partB64}`, null);
          const segments = (result.segments || [])
            .map((s: any) => ({
              start: (Number(s.start) || 0) + offset,
              end: (Number(s.end) || 0) + offset,
              text: String(s.text || '').trim(),
            }))
            .filter((s: any) => s.text.length > 0);

          if (segments.length) {
            await q(
              sql,
              sql`INSERT INTO lesson_audio_segments (id, lesson_id, track, idx, offset_seconds, segments)
                  VALUES (${crypto.randomUUID()}, ${lessonId}, 'mixed', ${i}, ${offset}, ${JSON.stringify(segments)}::jsonb)`
            );
            totalSegments += segments.length;
          }
        }

        if (!totalSegments) throw new Error('Речь в файле не обнаружена');

        // 3. Финализация: длительность, чистка
        await q(sql, sql`UPDATE lessons SET duration_seconds = ${Math.round(durationSec)} WHERE id = ${lessonId} AND (duration_seconds IS NULL OR duration_seconds = 0)`);
        await q(sql, sql`DELETE FROM dev_upload_chunks WHERE lesson_id = ${lessonId}`);
        await q(sql, sql`DELETE FROM dev_upload_chunks WHERE created_at < now() - interval '1 day'`);

        return NextResponse.json({
          ok: true,
          durationSeconds: Math.round(durationSec),
          parts: partCount,
          segments: totalSegments,
        });
      } finally {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {}
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Dev upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}

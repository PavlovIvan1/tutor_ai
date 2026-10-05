import { NextRequest, NextResponse } from 'next/server';
import { getDb, isDbConfigured, q } from '@/lib/db';
import { transcribeBase64 } from '@/lib/services/transcription';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;

const DEMO_TUTOR_ID = 'd0d6f84a-1234-5678-9abc-def012345678';
const DEFAULT_STUDENT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Загрузка посегментной аудиозаписи.
 * Каждый запрос несёт один валидный аудиофайл (сегмент записи),
 * поэтому тело запроса всегда меньше лимита Vercel (4.5 MB).
 * Сегмент транскрибируется сразу и сохраняется в lesson_audio_segments.
 */
export async function POST(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const sql = getDb();

  try {
    const body = await req.json();
    const { lessonId, studentId, studentName, studentLevel, studentGoals, durationSeconds, track, index, data, init } = body;

    const createLesson = async (): Promise<string> => {
      const id = crypto.randomUUID();
      const resolvedStudentId =
        studentId && studentId !== DEFAULT_STUDENT_ID ? studentId : DEFAULT_STUDENT_ID;

      if (resolvedStudentId !== DEFAULT_STUDENT_ID) {
        const existingStudent = await q(sql, sql`SELECT id FROM students WHERE id = ${resolvedStudentId} LIMIT 1`);
        if (!existingStudent.length) {
          await q(sql, sql`INSERT INTO students (id, tutor_id, name, level, goals) VALUES (${resolvedStudentId}, ${DEMO_TUTOR_ID}, ${studentName || 'Student'}, ${studentLevel || 'A1'}, ${studentGoals || 'General English'}) ON CONFLICT (id) DO NOTHING`);
        }
      }

      await q(sql, sql`INSERT INTO lessons (id, tutor_id, student_id, status, started_at, ended_at, duration_seconds) VALUES (${id}, ${DEMO_TUTOR_ID}, ${resolvedStudentId}, 'processing', NOW(), NOW(), ${durationSeconds || 0})`);
      return id;
    };

    // init: только создаём урок и возвращаем его id
    if (init) {
      const id = lessonId || await createLesson();
      return NextResponse.json({ lessonId: id, ok: true });
    }

    if (track !== 'mic' && track !== 'system') {
      return NextResponse.json({ error: 'track must be "mic" or "system"' }, { status: 400 });
    }
    if (typeof data !== 'string' || data.length < 100) {
      return NextResponse.json({ error: 'No audio data' }, { status: 400 });
    }

    // 1. Урок: создаём при первом сегменте
    let lesson = lessonId;
    if (lesson) {
      const exists = await q(sql, sql`SELECT id FROM lessons WHERE id = ${lesson} LIMIT 1`);
      if (!exists.length) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    } else {
      lesson = await createLesson();
    }

    // 2. Транскрибация сегмента
    const result = await transcribeBase64(data);
    const segments = (result.segments || []).map((s: any) => ({
      start: Number(s.start) || 0,
      end: Number(s.end) || 0,
      text: String(s.text || '').trim(),
    })).filter((s: any) => s.text.length > 0);

    const segmentDuration = segments.length ? Math.max(...segments.map((s: any) => s.end)) : 0;

    // 3. Смещение времени внутри трека (сегменты идут подряд)
    const prevRows = await q(sql, sql`SELECT COALESCE(SUM(offset_seconds + duration), 0) as total FROM (SELECT offset_seconds, (SELECT COALESCE(MAX((seg->>'end')::float), 0) FROM jsonb_array_elements(segments) seg) as duration FROM lesson_audio_segments WHERE lesson_id = ${lesson} AND track = ${track}) t`);
    const offset = Number(prevRows[0]?.total) || 0;

    const shifted = segments.map((s: any) => ({ ...s, start: s.start + offset, end: s.end + offset }));

    await q(sql, sql`INSERT INTO lesson_audio_segments (id, lesson_id, track, idx, offset_seconds, segments) VALUES (${crypto.randomUUID()}, ${lesson}, ${track}, ${Number(index) || 0}, ${offset}, ${JSON.stringify(shifted)}::jsonb)`);

    return NextResponse.json({ lessonId: lesson, ok: true, index: Number(index) || 0, segments: shifted.length });
  } catch (error: any) {
    console.error('Lesson audio upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getDb, isDbConfigured, q } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

const DEMO_TUTOR_ID = 'd0d6f84a-1234-5678-9abc-def012345678';
const MAX_CONTENT_CHARS = 400_000;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = require('pdf-parse/lib/pdf-parse.js');

export async function GET() {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const sql = getDb();
  try {
    const rows = await q(sql, sql`SELECT id, filename, category, created_at, length(content) as size FROM materials WHERE tutor_id = ${DEMO_TUTOR_ID} ORDER BY created_at DESC`);
    return NextResponse.json({ materials: rows });
  } catch (error: any) {
    console.error('Materials list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const sql = getDb();

  try {
    const body = await req.json();
    const filename = String(body.filename || '').trim();
    const category = String(body.category || 'general').trim();
    if (!filename) return NextResponse.json({ error: 'filename required' }, { status: 400 });

    let content = '';

    if (typeof body.text === 'string' && body.text.trim()) {
      content = body.text;
    } else if (body.fileBase64) {
      const isPdf = filename.toLowerCase().endsWith('.pdf') || body.mime === 'application/pdf';
      if (!isPdf) {
        return NextResponse.json({ error: 'Поддерживаются .txt, .md, .csv, .json и .pdf' }, { status: 400 });
      }
      const buffer = Buffer.from(String(body.fileBase64), 'base64');
      const parsed = await pdfParse(buffer);
      content = parsed.text || '';
    }

    content = content.trim();
    if (!content) {
      return NextResponse.json({ error: 'Не удалось извлечь текст из файла' }, { status: 400 });
    }
    if (content.length > MAX_CONTENT_CHARS) content = content.slice(0, MAX_CONTENT_CHARS);

    const id = crypto.randomUUID();
    await q(sql, sql`INSERT INTO materials (id, tutor_id, filename, category, content) VALUES (${id}, ${DEMO_TUTOR_ID}, ${filename}, ${category}, ${content})`);

    return NextResponse.json({ id, filename, category, size: content.length });
  } catch (error: any) {
    console.error('Material upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

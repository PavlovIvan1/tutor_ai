import { NextRequest, NextResponse } from 'next/server';
import { getDb, isDbConfigured, q } from '@/lib/db';

const DEMO_TUTOR_ID = 'd0d6f84a-1234-5678-9abc-def012345678';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const sql = getDb();
  try {
    const rows = await q(sql, sql`SELECT * FROM students WHERE tutor_id = ${DEMO_TUTOR_ID} AND (is_archived = false OR is_archived IS NULL) ORDER BY name ASC`);
    return NextResponse.json({ students: rows });
  } catch (error: any) {
    console.error('Students list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const sql = getDb();
  const body = await req.json();
  const { name, email, level, goals, notes } = body;

  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  try {
    const id = crypto.randomUUID();
    await q(sql, sql`INSERT INTO students (id, tutor_id, name, email, level, goals, notes, is_archived) VALUES (${id}, ${DEMO_TUTOR_ID}, ${name}, ${email || null}, ${level || 'A1'}, ${goals || null}, ${notes || null}, false)`);

    return NextResponse.json({ id, name });
  } catch (error: any) {
    console.error('Create student error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

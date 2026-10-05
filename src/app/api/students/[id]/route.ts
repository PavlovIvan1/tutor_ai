import { NextRequest, NextResponse } from 'next/server';
import { getDb, isDbConfigured, q } from '@/lib/db';

export const dynamic = 'force-dynamic';

const DEMO_TUTOR_ID = 'd0d6f84a-1234-5678-9abc-def012345678';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const sql = getDb();
  const studentId = params.id;

  try {
    const studentRows = await q(sql, sql`SELECT * FROM students WHERE id = ${studentId} LIMIT 1`);
    if (!studentRows.length) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const lessons = await q(sql, sql`SELECT l.*, la.summary, la.topics, la.strengths, la.weaknesses, la.recurring_weaknesses, la.recommended_practice, la.next_lesson_recommendation, la.key_vocabulary, la.grammar_focus, la.engagement_score, la.student_level_assessment, h.id as homework_id, h.title as homework_title FROM lessons l LEFT JOIN lesson_analyses la ON la.lesson_id = l.id LEFT JOIN homeworks h ON h.lesson_id = l.id WHERE l.student_id = ${studentId} ORDER BY l.created_at DESC`);

    return NextResponse.json({ student: studentRows[0], lessons });
  } catch (error: any) {
    console.error('Student detail error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

const EDITABLE = ['name', 'email', 'level', 'goals', 'notes'] as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const sql = getDb();
  const studentId = params.id;

  try {
    const existing = await q(sql, sql`SELECT * FROM students WHERE id = ${studentId} AND tutor_id = ${DEMO_TUTOR_ID} LIMIT 1`);
    if (!existing.length) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const body = await req.json();
    const merged: Record<string, any> = { ...existing[0] };
    for (const field of EDITABLE) {
      if (body[field] !== undefined) merged[field] = body[field];
    }

    const name = String(merged.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    const updated = await q(sql, sql`UPDATE students SET name = ${name}, email = ${merged.email || null}, level = ${merged.level || 'A1'}, goals = ${merged.goals || null}, notes = ${merged.notes || null}, updated_at = now() WHERE id = ${studentId} RETURNING *`);

    return NextResponse.json({ student: updated[0] });
  } catch (error: any) {
    console.error('Student update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

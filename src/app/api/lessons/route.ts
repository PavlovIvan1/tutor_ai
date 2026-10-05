import { NextRequest, NextResponse } from 'next/server';
import { getDb, isDbConfigured, q } from '@/lib/db';

export const dynamic = 'force-dynamic';

const DEMO_TUTOR_ID = 'd0d6f84a-1234-5678-9abc-def012345678';

export async function GET(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const sql = getDb();
  const tutorId = req.nextUrl.searchParams.get('tutor_id') || DEMO_TUTOR_ID;

  try {
    const rows = await q(sql, sql`SELECT l.*, s.name as student_name, s.level as student_level, s.goals as student_goals, la.summary as analysis_summary, la.topics as analysis_topics, la.key_vocabulary as analysis_key_vocabulary, la.grammar_focus as analysis_grammar_focus, la.engagement_score as analysis_engagement_score, h.id as homework_id, h.title as homework_title FROM lessons l LEFT JOIN students s ON l.student_id = s.id LEFT JOIN lesson_analyses la ON la.lesson_id = l.id LEFT JOIN homeworks h ON h.lesson_id = l.id WHERE l.tutor_id = ${tutorId} ORDER BY l.created_at DESC LIMIT 50`);

    return NextResponse.json({ lessons: rows });
  } catch (error: any) {
    console.error('Lessons list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

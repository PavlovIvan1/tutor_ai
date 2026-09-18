import { NextRequest, NextResponse } from 'next/server';
import { getDb, isDbConfigured, q } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const sql = getDb();
  const lessonId = params.id;

  try {
    const lessonRows = await q(sql, sql`SELECT l.*, s.name as student_name, s.level as student_level, s.goals as student_goals FROM lessons l LEFT JOIN students s ON l.student_id = s.id WHERE l.id = ${lessonId}`);
    if (!lessonRows.length) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

    const lesson = lessonRows[0];
    const transcriptRows = await q(sql, sql`SELECT * FROM lesson_transcripts WHERE lesson_id = ${lessonId} LIMIT 1`);
    const analysisRows = await q(sql, sql`SELECT * FROM lesson_analyses WHERE lesson_id = ${lessonId} LIMIT 1`);
    const homeworkRows = await q(sql, sql`SELECT * FROM homeworks WHERE lesson_id = ${lessonId} LIMIT 1`);

    let homework = homeworkRows[0] || null;
    if (homework) {
      const questionRows = await q(sql, sql`SELECT * FROM homework_questions WHERE homework_id = ${homework.id} ORDER BY sort_order`);
      homework = { ...homework, questions: questionRows };
    }

    return NextResponse.json({
      lesson,
      transcript: transcriptRows[0]?.raw_text || '',
      segments: transcriptRows[0]?.segments || [],
      analysis: analysisRows[0] || null,
      student: { name: lesson.student_name, level: lesson.student_level, goals: lesson.student_goals },
      homework,
    });
  } catch (error: any) {
    console.error('Lesson detail error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

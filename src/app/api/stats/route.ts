import { NextRequest, NextResponse } from 'next/server';
import { getDb, isDbConfigured, q } from '@/lib/db';

export const dynamic = 'force-dynamic';

const DEMO_TUTOR_ID = 'd0d6f84a-1234-5678-9abc-def012345678';

export async function GET(_req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const sql = getDb();

  try {
    const students = await q(sql, sql`SELECT id, name, level, goals, created_at FROM students WHERE tutor_id = ${DEMO_TUTOR_ID} AND (is_archived = false OR is_archived IS NULL)`);

    let lessons: Record<string, any>[] = [];
    try {
      lessons = await q(sql, sql`SELECT l.*, la.summary, la.topics, la.strengths, la.weaknesses, la.engagement_score, la.key_vocabulary, la.grammar_focus, h.id as homework_id FROM lessons l LEFT JOIN lesson_analyses la ON la.lesson_id = l.id LEFT JOIN homeworks h ON h.lesson_id = l.id WHERE l.tutor_id = ${DEMO_TUTOR_ID} ORDER BY l.created_at DESC`);
    } catch (lessonsError: any) {
      console.error('Stats lessons error:', lessonsError);
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lessonsThisWeek = lessons.filter((l: any) => new Date(l.created_at) >= weekAgo);
    const completedLessons = lessons.filter((l: any) => l.status === 'completed');
    const pendingHomework = completedLessons.filter((l: any) => !l.homework_id);

    return NextResponse.json({
      students: students.map((s: any) => ({
        ...s,
        lessonCount: lessons.filter((l: any) => l.student_id === s.id).length,
        lastLesson: lessons.find((l: any) => l.student_id === s.id) || null,
        analyses: lessons.filter((l: any) => l.student_id === s.id).slice(0, 10),
      })),
      stats: {
        totalStudents: students.length,
        lessonsThisWeek: lessonsThisWeek.length,
        totalLessons: completedLessons.length,
        pendingHomework: pendingHomework.length,
      },
      recentLessons: lessons.slice(0, 5),
      lessonsWithoutHomework: pendingHomework.slice(0, 5),
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

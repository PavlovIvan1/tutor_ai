import { NextRequest, NextResponse } from 'next/server';
import { getDb, isDbConfigured, q } from '@/lib/db';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  if (!OPENAI_API_KEY) return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });

  const sql = getDb();
  const { lessonId } = await req.json();
  if (!lessonId) return NextResponse.json({ error: 'lessonId required' }, { status: 400 });

  try {
    const transcriptRows = await q(sql, sql`SELECT raw_text FROM lesson_transcripts WHERE lesson_id = ${lessonId} LIMIT 1`);
    const analysisRows = await q(sql, sql`SELECT * FROM lesson_analyses WHERE lesson_id = ${lessonId} LIMIT 1`);
    const lessonRows = await q(sql, sql`SELECT l.*, s.name as student_name, s.level as student_level FROM lessons l LEFT JOIN students s ON l.student_id = s.id WHERE l.id = ${lessonId}`);

    if (!transcriptRows.length) return NextResponse.json({ error: 'No transcript found' }, { status: 404 });

    const transcript: string = transcriptRows[0].raw_text;
    const analysis = analysisRows[0] || {};
    const lesson = lessonRows[0] || {};
    const rawAi = analysis.raw_ai_response
      ? (typeof analysis.raw_ai_response === 'string' ? JSON.parse(analysis.raw_ai_response) : analysis.raw_ai_response)
      : {};

    const prevHomeworkRows = await q(sql, sql`SELECT h.id, array_agg(hq.question_text) as questions FROM homeworks h LEFT JOIN homework_questions hq ON hq.homework_id = h.id WHERE h.student_id = ${lesson.student_id} GROUP BY h.id ORDER BY h.created_at DESC LIMIT 5`);

    const prevQuestions = prevHomeworkRows.map((h: any) => h.questions?.filter(Boolean).join('; ')).filter(Boolean).join('\n');

    const prompt = `You are creating homework for an English tutoring student after their lesson.

## Student
- Name: ${lesson.student_name || 'Student'}
- Level: ${lesson.student_level || 'unknown'}
- Student goals: review their profile and tailor exercises accordingly

## Lesson Summary
${rawAi.summary || analysis.summary || 'No summary available'}

## Topics Covered
${JSON.stringify(rawAi.topics || analysis.topics || [])}

## Student Weaknesses
${JSON.stringify(rawAi.weaknesses || analysis.weaknesses || [])}

## Key Vocabulary from Lesson
${JSON.stringify(rawAi.key_vocabulary || [])}

## Grammar Points Practiced
${JSON.stringify(rawAi.grammar_focus || [])}

## Full Transcript (for context)
${transcript.substring(0, 3000)}

${prevQuestions ? `\n## Previous Homework (DO NOT repeat these questions):\n${prevQuestions}` : ''}

## Instructions
Create 5-8 homework questions that:
1. Focus on the student's WEAKNESSES — drill what they struggled with
2. Include key vocabulary from the lesson
3. Practice the grammar points covered
4. Match the student's level (don't make it too easy or too hard)
5. Mix question types: multiple_choice, fill_blank, short_answer
6. Each question must have a clear correct_answer and helpful explanation
7. If student's goal is exam prep, include exam-style questions
8. If student's goal is conversation, include more short_answer questions

## Output (JSON only):
{
  "title": "Homework: [specific topic] — Week of [date]",
  "questions": [
    {"type": "multiple_choice", "question": "...", "options": ["A","B","C","D"], "correct_answer": "B", "explanation": "..."},
    {"type": "fill_blank", "question": "...", "correct_answer": "...", "explanation": "..."},
    {"type": "short_answer", "question": "...", "correct_answer": "Open-ended", "explanation": "..."}
  ]
}`;

    const aiRes = await fetch('https://polza.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        messages: [
          { role: 'system', content: 'You are an experienced English language teacher creating personalized homework. You understand CEFR levels, communicative teaching, and exam preparation. Always respond with valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 3000,
      }),
    });

    if (!aiRes.ok) return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });

    const aiData = await aiRes.json();
    let homeworkData: any;
    try {
      const content = aiData.choices[0]?.message?.content || '{}';
      homeworkData = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    const homeworkId = crypto.randomUUID();
    const hwTitle = homeworkData.title || `Homework: ${(rawAi.topics || analysis.topics || ['Review']).join(', ')}`;
    await q(sql, sql`INSERT INTO homeworks (id, lesson_id, student_id, tutor_id, title, status) VALUES (${homeworkId}, ${lessonId}, ${lesson.student_id}, ${lesson.tutor_id}, ${hwTitle}, 'draft')`);

    for (let i = 0; i < (homeworkData.questions || []).length; i++) {
      const qQ = homeworkData.questions[i];
      await q(sql, sql`INSERT INTO homework_questions (id, homework_id, type, question_text, options, correct_answer, explanation, sort_order) VALUES (${crypto.randomUUID()}, ${homeworkId}, ${qQ.type || 'multiple_choice'}, ${qQ.question || ''}, ${JSON.stringify(qQ.options || [])}::jsonb, ${qQ.correct_answer || ''}, ${qQ.explanation || ''}, ${i})`);
    }

    return NextResponse.json({ homework: { id: homeworkId, title: homeworkData.title, questions: homeworkData.questions } });
  } catch (error: any) {
    console.error('Homework generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

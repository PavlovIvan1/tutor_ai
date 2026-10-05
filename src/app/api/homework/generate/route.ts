import { NextRequest, NextResponse } from 'next/server';
import { getDb, isDbConfigured, q } from '@/lib/db';
import {
  HOMEWORK_SYSTEM_PROMPT,
  buildHomeworkPrompt,
  defaultHomeworkOptions,
  materialsToPromptText,
  normalizeQuestionType,
  pickMaterials,
  type HomeworkOptions,
} from '@/lib/prompts';
import { normalizeHomeworkOptions, scrubHomeworkQuestion } from '@/lib/homework';

export const runtime = 'nodejs';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  if (!OPENAI_API_KEY) return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });

  const sql = getDb();
  const body = await req.json();
  const { lessonId } = body;
  if (!lessonId) return NextResponse.json({ error: 'lessonId required' }, { status: 400 });

  const options: HomeworkOptions = {
    ...defaultHomeworkOptions(),
    ...(body.options || {}),
    questionTypes: Array.isArray(body.options?.questionTypes) && body.options.questionTypes.length
      ? body.options.questionTypes
      : defaultHomeworkOptions().questionTypes,
  };

  try {
    const transcriptRows = await q(sql, sql`SELECT raw_text FROM lesson_transcripts WHERE lesson_id = ${lessonId} LIMIT 1`);
    const analysisRows = await q(sql, sql`SELECT * FROM lesson_analyses WHERE lesson_id = ${lessonId} LIMIT 1`);
    const lessonRows = await q(sql, sql`SELECT l.*, s.name as student_name, s.level as student_level, s.goals as student_goals FROM lessons l LEFT JOIN students s ON l.student_id = s.id WHERE l.id = ${lessonId}`);

    if (!transcriptRows.length) return NextResponse.json({ error: 'No transcript found' }, { status: 404 });

    const transcript: string = transcriptRows[0].raw_text;
    const analysis = analysisRows[0] || {};
    const lesson = lessonRows[0] || {};
    const rawAi = analysis.raw_ai_response
      ? (typeof analysis.raw_ai_response === 'string' ? JSON.parse(analysis.raw_ai_response) : analysis.raw_ai_response)
      : {};

    const prevHomeworkRows = await q(sql, sql`SELECT h.id, array_agg(hq.question_text) as questions FROM homeworks h LEFT JOIN homework_questions hq ON hq.homework_id = h.id WHERE h.student_id = ${lesson.student_id} GROUP BY h.id ORDER BY h.created_at DESC LIMIT 5`);
    const prevQuestions = prevHomeworkRows
      .map((h: any) => h.questions?.filter(Boolean).join('; '))
      .filter(Boolean)
      .join('\n');

    const materialRows = await q(sql, sql`SELECT filename, category, content FROM materials WHERE tutor_id = ${lesson.tutor_id || 'd0d6f84a-1234-5678-9abc-def012345678'} ORDER BY created_at DESC`);
    const materialsText = materialsToPromptText(
      pickMaterials(materialRows as any, lesson.student_goals || '', options.examStyle)
    );

    const prompt = buildHomeworkPrompt({
      studentName: lesson.student_name || 'Student',
      studentLevel: lesson.student_level || 'unknown',
      studentGoals: lesson.student_goals || 'General English improvement',
      summary: rawAi.summary || analysis.summary || 'No summary available',
      topics: rawAi.topics || analysis.topics || [],
      weaknesses: rawAi.weaknesses || analysis.weaknesses || [],
      strengths: rawAi.strengths || analysis.strengths || [],
      vocabulary: rawAi.key_vocabulary || analysis.key_vocabulary || [],
      grammar: rawAi.grammar_focus || analysis.grammar_focus || [],
      transcript,
      prevQuestions: prevQuestions || undefined,
      materialsText: materialsText || undefined,
      options,
    });

    const aiRes = await fetch('https://polza.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        messages: [
          { role: 'system', content: HOMEWORK_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        // Резервация Polza пропорциональна max_tokens (≈0.0014₽/токен) — при малом балансе
        // 8000 не проходит (402 INSUFFICIENT_BALANCE). Поднять до 6000 после пополнения.
        max_tokens: 4000,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => '');
      console.error('AI generation failed:', aiRes.status, errText.slice(0, 300));
      const message = aiRes.status === 402
        ? 'AI generation failed: insufficient Polza AI balance (402) — top up the account'
        : `AI generation failed (${aiRes.status})`;
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const aiData = await aiRes.json();
    let homeworkData: any;
    try {
      const content = aiData.choices[0]?.message?.content || '{}';
      homeworkData = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    const homeworkId = crypto.randomUUID();
    const aiTitle = homeworkData.title || `Homework: ${(rawAi.topics || analysis.topics || ['Review']).join(', ')}`;
    const baseTitle = aiTitle
      .replace(/\s*[—–-]\s*[A-Za-zА-Яа-я]{3,9}\s+\d{1,2},\s*\d{4}\s*$/, '')
      .replace(/\s*[—–-]\s*\d{1,2}[./]\d{1,2}[./]\d{2,4}\s*$/, '')
      .trim();
    const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const hwTitle = /^homework\b/i.test(baseTitle) ? `${baseTitle} — ${todayStr}` : `Homework: ${baseTitle} — ${todayStr}`;
    const theory = homeworkData.theory && (homeworkData.theory.explanation || homeworkData.theory.topic)
      ? homeworkData.theory
      : null;

    await q(sql, sql`INSERT INTO homeworks (id, lesson_id, student_id, tutor_id, title, status, theory, options) VALUES (${homeworkId}, ${lessonId}, ${lesson.student_id}, ${lesson.tutor_id}, ${hwTitle}, 'draft', ${JSON.stringify(theory)}::jsonb, ${JSON.stringify(options)}::jsonb)`);

    try {
      for (let i = 0; i < (homeworkData.questions || []).length; i++) {
        const qQ = homeworkData.questions[i];
        const type = normalizeQuestionType(qQ.type, qQ.options);
        const { text, correctAnswer } = scrubHomeworkQuestion(qQ.question || '', qQ.correct_answer || '');
        const opts = normalizeHomeworkOptions(qQ.options, text);
        await q(sql, sql`INSERT INTO homework_questions (id, homework_id, type, question_text, options, correct_answer, explanation, sort_order) VALUES (${crypto.randomUUID()}, ${homeworkId}, ${type}, ${text}, ${JSON.stringify(opts)}::jsonb, ${correctAnswer}, ${qQ.explanation || ''}, ${i})`);
      }
    } catch (e: any) {
      await q(sql, sql`DELETE FROM homework_questions WHERE homework_id = ${homeworkId}`);
      await q(sql, sql`DELETE FROM homeworks WHERE id = ${homeworkId}`);
      throw e;
    }

    return NextResponse.json({
      homework: {
        id: homeworkId,
        title: hwTitle,
        theory,
        questions: homeworkData.questions,
      },
    });
  } catch (error: any) {
    console.error('Homework generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

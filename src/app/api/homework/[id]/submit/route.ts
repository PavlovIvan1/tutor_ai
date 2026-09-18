import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

interface HomeworkExercise {
  type: 'multiple_choice' | 'fill_blank' | 'short_answer';
  question_text: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string;
}

function mockHomework(weaknesses: string[], level: string): HomeworkExercise[] {
  const exercises: HomeworkExercise[] = [];

  if (weaknesses.some(w => w.toLowerCase().includes('present perfect'))) {
    exercises.push(
      {
        type: 'multiple_choice',
        question_text: 'I _____ to London three times.',
        options: ['went', 'have been', 'was', 'have gone'],
        correct_answer: 'have been',
        explanation: '"Have been" is Present Perfect, used for life experiences without a specific time.',
      },
      {
        type: 'fill_blank',
        question_text: 'She _____ already _____ the report.',
        options: null,
        correct_answer: 'has finished',
        explanation: 'Present Perfect with "already" uses has/have + past participle.',
      },
      {
        type: 'multiple_choice',
        question_text: '_____ you ever _____ to Paris?',
        options: ['Did / go', 'Have / been', 'Did / been', 'Have / go'],
        correct_answer: 'Have / been',
        explanation: '"Have you ever been" is the correct Present Perfect form for life experiences.',
      }
    );
  }

  if (weaknesses.some(w => w.toLowerCase().includes('irregular'))) {
    exercises.push(
      {
        type: 'fill_blank',
        question_text: 'I _____ (go) to the store yesterday.',
        options: null,
        correct_answer: 'went',
        explanation: '"Go" is an irregular verb. Past simple: go → went.',
      },
      {
        type: 'multiple_choice',
        question_text: 'She _____ (eat) all the cake.',
        options: ['eated', 'eat', 'ate', 'eaten'],
        correct_answer: 'ate',
        explanation: '"Eat" is irregular. Past simple: eat → ate.',
      }
    );
  }

  // Add general exercises based on level
  if (level === 'B1' || level === 'B2') {
    exercises.push(
      {
        type: 'short_answer',
        question_text: 'Write a sentence using Present Perfect about something you have done today.',
        options: null,
        correct_answer: 'I have eaten breakfast today.',
        explanation: 'Any correct Present Perfect sentence with today is acceptable.',
      },
      {
        type: 'fill_blank',
        question_text: 'I haven\'t finished _____ .',
        options: null,
        correct_answer: 'yet',
        explanation: '"Yet" is used in negative sentences with Present Perfect.',
      }
    );
  }

  // Ensure we have at least 5 exercises
  while (exercises.length < 5) {
    exercises.push({
      type: 'multiple_choice',
      question_text: `Choose the correct form: She _____ (live) in London since 2020.`,
      options: ['lives', 'has lived', 'is living', 'lived'],
      correct_answer: 'has lived',
      explanation: '"Since" indicates a period from past to now, requiring Present Perfect.',
    });
  }

  return exercises.slice(0, 8);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { action } = await request.json();
    const lessonId = params.id;

    const supabase = createServerSupabase();

    // Get lesson with analysis
    const { data: lesson } = await supabase
      .from('lessons')
      .select('*, student:students(*), analysis:lesson_analyses(*)')
      .eq('id', lessonId)
      .single();

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const analysis = lesson.analysis?.[0];
    if (!analysis) {
      return NextResponse.json({ error: 'No analysis found' }, { status: 400 });
    }

    // Get student memories for recurring weaknesses
    const { data: memories } = await supabase
      .from('student_memories')
      .select('*')
      .eq('student_id', lesson.student_id)
      .eq('category', 'weakness');

    const weaknesses = [
      ...analysis.weaknesses,
      ...(memories?.map((m) => m.content) || []),
    ];

    // Generate homework
    const exercises = mockHomework(weaknesses, lesson.student.level);

    // Create homework record
    const { data: homework, error: homeworkError } = await supabase
      .from('homeworks')
      .insert({
        lesson_id: lessonId,
        student_id: lesson.student_id,
        tutor_id: lesson.tutor_id,
        title: `Homework: ${analysis.topics.join(', ') || 'Practice'}`,
        status: 'draft',
      })
      .select()
      .single();

    if (homeworkError) throw homeworkError;

    // Create questions
    const questions = exercises.map((ex, i) => ({
      homework_id: homework.id,
      type: ex.type,
      question_text: ex.question_text,
      options: ex.options,
      correct_answer: ex.correct_answer,
      explanation: ex.explanation,
      sort_order: i,
    }));

    const { error: questionsError } = await supabase
      .from('homework_questions')
      .insert(questions);

    if (questionsError) throw questionsError;

    return NextResponse.json({ homeworkId: homework.id });
  } catch (error: any) {
    console.error('Homework generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

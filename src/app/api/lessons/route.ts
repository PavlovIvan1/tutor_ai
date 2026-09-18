import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { transcribeAudio } from '@/lib/services/transcription';
import { analyzeLesson } from '@/lib/services/ai';

export async function POST(request: Request) {
  try {
    const { lessonId } = await request.json();

    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId is required' }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Get the lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*, student:students(*)')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Get transcript (or transcribe if not exists)
    let transcript: string;

    const { data: existingTranscript } = await supabase
      .from('lesson_transcripts')
      .select('raw_text')
      .eq('lesson_id', lessonId)
      .single();

    if (existingTranscript?.raw_text) {
      transcript = existingTranscript.raw_text;
    } else {
      // Transcribe
      if (!lesson.audio_url) {
        return NextResponse.json({ error: 'No audio URL' }, { status: 400 });
      }

      const transcriptionResult = await transcribeAudio(lesson.audio_url);

      await supabase.from('lesson_transcripts').insert({
        lesson_id: lessonId,
        raw_text: transcriptionResult.text,
        segments: transcriptionResult.segments,
      });

      transcript = transcriptionResult.text;
    }

    // Get previous lessons for this student
    const { data: previousLessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('student_id', lesson.student_id)
      .neq('id', lessonId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    const previousLessonIds = previousLessons?.map((l) => l.id) || [];

    // Get previous analyses
    let previousAnalyses: any[] = [];
    if (previousLessonIds.length > 0) {
      const { data } = await supabase
        .from('lesson_analyses')
        .select('*')
        .in('lesson_id', previousLessonIds);

      previousAnalyses = data || [];
    }

    // Get student memories
    const { data: memories } = await supabase
      .from('student_memories')
      .select('*')
      .eq('student_id', lesson.student_id);

    // Get previous homework results
    const { data: homeworkAttempts } = await supabase
      .from('homework_attempts')
      .select('*, homework:homeworks(*)')
      .eq('student_id', lesson.student_id);

    // AI Analysis
    const analysis = await analyzeLesson({
      transcript,
      studentLevel: lesson.student.level,
      studentGoals: lesson.student.goals,
      previousAnalyses,
      memories: memories || [],
      homeworkAttempts: homeworkAttempts || [],
    });

    // Save analysis
    const { error: analysisError } = await supabase.from('lesson_analyses').insert({
      lesson_id: lessonId,
      summary: analysis.summary,
      topics: analysis.topics,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      recurring_weaknesses: analysis.recurringWeaknesses,
      recommended_practice: analysis.recommendedPractice,
      next_lesson_recommendation: analysis.nextLessonRecommendation,
      raw_ai_response: analysis,
    });

    if (analysisError) {
      console.error('Failed to save analysis:', analysisError);
    }

    // Update student memories
    for (const weakness of analysis.weaknesses) {
      // Check if memory exists
      const { data: existingMemory } = await supabase
        .from('student_memories')
        .select('*')
        .eq('student_id', lesson.student_id)
        .eq('category', 'weakness')
        .ilike('content', `%${weakness}%`)
        .single();

      if (existingMemory) {
        // Update existing memory
        await supabase
          .from('student_memories')
          .update({
            lesson_count: existingMemory.lesson_count + 1,
            last_reinforced_at: new Date().toISOString(),
          })
          .eq('id', existingMemory.id);
      } else {
        // Create new memory
        await supabase.from('student_memories').insert({
          student_id: lesson.student_id,
          category: 'weakness',
          content: weakness,
          first_detected_at: new Date().toISOString(),
          last_reinforced_at: new Date().toISOString(),
          lesson_count: 1,
        });
      }
    }

    for (const strength of analysis.strengths) {
      const { data: existing } = await supabase
        .from('student_memories')
        .select('*')
        .eq('student_id', lesson.student_id)
        .eq('category', 'strength')
        .ilike('content', `%${strength}%`)
        .single();

      if (!existing) {
        await supabase.from('student_memories').insert({
          student_id: lesson.student_id,
          category: 'strength',
          content: strength,
          first_detected_at: new Date().toISOString(),
          last_reinforced_at: new Date().toISOString(),
          lesson_count: 1,
        });
      }
    }

    // Update lesson status
    await supabase
      .from('lessons')
      .update({ status: 'completed' })
      .eq('id', lessonId);

    return NextResponse.json({ success: true, lessonId });
  } catch (error: any) {
    console.error('Lesson processing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { q, isDbConfigured, getDb } from '@/lib/db';
import { transcribeBase64 } from '@/lib/services/transcription';
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt, materialsToPromptText, normalizeQuestionType, pickMaterials } from '@/lib/prompts';
import { normalizeHomeworkOptions, scrubHomeworkQuestion } from '@/lib/homework';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const POLZA_BASE = 'https://polza.ai/api/v1';

async function transcribeAudio(audioBase64: string, label: string): Promise<{ text: string; segments: any[] }> {
  const dataBuffer = Buffer.from(audioBase64, 'base64');
  if (dataBuffer.length < 100) {
    return { text: '', segments: [] };
  }
  return transcribeBase64(audioBase64);
}

function mergeTranscripts(
  teacherSegments: any[],
  studentSegments: any[]
): { merged: any[]; fullText: string } {
  // Tag each segment with speaker
  const tagged = [
    ...teacherSegments.map((s) => ({ ...s, speaker: 'TEACHER' })),
    ...studentSegments.map((s) => ({ ...s, speaker: 'STUDENT' })),
  ];

  // Sort by start time
  tagged.sort((a, b) => a.start - b.start);

  // Build merged text
  let lastSpeaker = '';
  const merged = tagged.map((seg) => {
    const speaker = seg.speaker === lastSpeaker ? '' : `${seg.speaker}: `;
    lastSpeaker = seg.speaker;
    return {
      ...seg,
      displayText: `${speaker}${seg.text.trim()}`,
    };
  });

  const fullText = merged.map((m) => m.displayText).join('\n');
  return { merged, fullText };
}

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    console.error('DB not configured');
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const sql = getDb();
  const body = await req.json();
  const {
    micAudioBase64,       // single mic chunk
    systemAudioBase64,    // single system chunk
    micChunks = [],       // array of mic chunks
    systemChunks = [],    // array of system chunks
    audioBase64,          // legacy: mixed audio
    studentId,
    studentName,
    studentLevel,
    studentGoals,
    durationSeconds,
    swapTracks = false, // Reverb: микрофон = ученик, системный звук = учитель
    staged = false,     // аудио уже загружено через /api/lesson-audio
    lessonId: stagedLessonId,
  } = body;

  // Merge single + array forms
  let micBase64List: string[] = [...micChunks.filter((c: string) => c?.length > 100)];
  if (micAudioBase64?.length > 100) micBase64List.push(micAudioBase64);

  let systemBase64List: string[] = [...systemChunks.filter((c: string) => c?.length > 100)];
  if (systemAudioBase64?.length > 100) systemBase64List.push(systemAudioBase64);

  // Reverb: меняем треки местами — микрофон становится учеником, системный звук учителем
  if (swapTracks && micBase64List.length && systemBase64List.length) {
    const tmp = micBase64List;
    micBase64List = systemBase64List;
    systemBase64List = tmp;
  }

  const hasMic = micBase64List.length > 0;
  const hasSystem = systemBase64List.length > 0;
  const hasLegacy = audioBase64 && audioBase64.length > 100;

  if (!staged && !hasMic && !hasSystem && !hasLegacy) {
    console.error('No audio provided');
    return NextResponse.json({ error: 'No audio provided' }, { status: 400 });
  }

  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set');
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  // Use a fixed tutor_id for demo (all seeded students use this)
  const DEMO_TUTOR_ID = 'd0d6f84a-1234-5678-9abc-def012345678';

  // Ensure tutor profile exists
  const existingProfile = await q(sql, sql`SELECT id FROM profiles WHERE id = ${DEMO_TUTOR_ID} LIMIT 1`);
  if (!existingProfile.length) {
    await q(sql, sql`INSERT INTO profiles (id, email, full_name) VALUES (${DEMO_TUTOR_ID}, 'demo@tutorai.com', 'Demo Tutor') ON CONFLICT (id) DO NOTHING`);
  }

  // Ensure student exists in Neon (might only be in localStorage)
  let resolvedStudentId = studentId || '00000000-0000-0000-0000-000000000000';
  if (studentId && studentId !== '00000000-0000-0000-0000-000000000000') {
    const existingStudent = await q(sql, sql`SELECT id, tutor_id FROM students WHERE id = ${studentId} LIMIT 1`);
    if (existingStudent.length) {
      // Student exists, use its tutor_id
    } else {
      // Student doesn't exist in Neon — upsert it
      await q(sql, sql`INSERT INTO students (id, tutor_id, name, level, goals) VALUES (${studentId}, ${DEMO_TUTOR_ID}, ${studentName || 'Student'}, ${studentLevel || 'A1'}, ${studentGoals || 'General English'}) ON CONFLICT (id) DO NOTHING`);
    }
  }

  let lessonId: string;
  let stagedHasMic = false;
  let stagedHasSystem = false;
  let effectiveDuration = Number(durationSeconds) || 0;

  if (staged) {
    if (!stagedLessonId) {
      return NextResponse.json({ error: 'lessonId is required for staged processing' }, { status: 400 });
    }
    lessonId = String(stagedLessonId);
    const lessonRows = await q(sql, sql`SELECT id, duration_seconds FROM lessons WHERE id = ${lessonId} LIMIT 1`);
    if (!lessonRows.length) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }
    if (!effectiveDuration) effectiveDuration = Number(lessonRows[0].duration_seconds) || 0;
  } else {
    lessonId = crypto.randomUUID();
  }

  try {
    // 1. Create lesson record
    if (!staged) {
      await q(sql, sql`INSERT INTO lessons (id, tutor_id, student_id, status, started_at, ended_at, duration_seconds) VALUES (${lessonId}, ${DEMO_TUTOR_ID}, ${resolvedStudentId}, 'processing', NOW(), NOW(), ${durationSeconds || 0})`);
    }

    let allText = '';
    let allSegments: any[] = [];

    if (staged) {
      // Сегменты уже транскрибированы при загрузке через /api/lesson-audio
      const rows = await q(sql, sql`SELECT track, segments FROM lesson_audio_segments WHERE lesson_id = ${lessonId} ORDER BY track, idx`);
      if (!rows.length) {
        await q(sql, sql`UPDATE lessons SET status = 'failed' WHERE id = ${lessonId}`);
        return NextResponse.json({ error: 'No uploaded audio for this lesson', lessonId }, { status: 400 });
      }

      const micSegs = rows.filter((r: any) => r.track === 'mic').flatMap((r: any) => r.segments || []);
      const sysSegs = rows.filter((r: any) => r.track === 'system').flatMap((r: any) => r.segments || []);
      const mixedSegs = rows.filter((r: any) => r.track === 'mixed').flatMap((r: any) => r.segments || []);
      stagedHasMic = micSegs.length > 0;
      stagedHasSystem = sysSegs.length > 0;

      if (mixedSegs.length && !stagedHasMic && !stagedHasSystem) {
        // Dev-загрузка файла: один смешанный трек, ролей в аудио нет —
        // спикеров разберёт ИИ (trackInfo = Mixed)
        allSegments = mixedSegs
          .slice()
          .sort((a: any, b: any) => a.start - b.start)
          .map((s: any) => ({ ...s, speaker: 'UNKNOWN' }));
        allText = allSegments.map((s: any) => s.text).join(' ').trim();
      } else {
        const applySwap = swapTracks && stagedHasMic && stagedHasSystem;
        const teacherSegs = applySwap ? sysSegs : micSegs;
        const studentSegs = applySwap ? micSegs : sysSegs;

        const { merged, fullText } = mergeTranscripts(teacherSegs, studentSegs);
        allSegments = merged;
        allText = fullText;
      }

    } else if (hasMic || hasSystem) {
      // DUAL TRACK MODE: transcribe separately, then merge
      let teacherSegments: any[] = [];
      let studentSegments: any[] = [];

      if (hasMic) {
        console.log(`Transcribing mic (${swapTracks ? 'student' : 'teacher'}): ${micBase64List.length} chunk(s)...`);
        // Concatenate all mic chunks into one transcribe call if small enough
        // or transcribe each separately
        for (let i = 0; i < micBase64List.length; i++) {
          const micResult = await transcribeAudio(micBase64List[i], `${swapTracks ? 'student' : 'teacher'}_mic_${i}`);
          const offset = i * 300; // rough offset per chunk
          teacherSegments.push(...micResult.segments.map((s) => ({ ...s, start: s.start + offset, end: s.end + offset })));
          console.log(`Mic chunk ${i}: ${micResult.segments.length} segments`);
        }
      }

      if (hasSystem) {
        console.log(`Transcribing system (${swapTracks ? 'teacher' : 'student'}): ${systemBase64List.length} chunk(s)...`);
        for (let i = 0; i < systemBase64List.length; i++) {
          const sysResult = await transcribeAudio(systemBase64List[i], `${swapTracks ? 'teacher' : 'student'}_system_${i}`);
          const offset = i * 300;
          studentSegments.push(...sysResult.segments.map((s) => ({ ...s, start: s.start + offset, end: s.end + offset })));
          console.log(`System chunk ${i}: ${sysResult.segments.length} segments`);
        }
      }

      // Merge with speaker labels
      const { merged, fullText } = mergeTranscripts(teacherSegments, studentSegments);
      allSegments = merged;
      allText = fullText;

    } else {
      // LEGACY MODE: single mixed audio — AI will guess speakers
      console.log('Transcribing mixed audio...');
      const result = await transcribeAudio(audioBase64, 'mixed');
      allSegments = result.segments.map((s) => ({ ...s, speaker: 'UNKNOWN' }));
      allText = result.text;
    }

    if (!allText.trim()) {
      await q(sql, sql`UPDATE lessons SET status = 'failed' WHERE id = ${lessonId}`);
      return NextResponse.json({ error: 'Transcription empty — no speech detected', lessonId }, { status: 400 });
    }

    // 2. Save transcript
    const transcriptId = crypto.randomUUID();
    await q(sql, sql`INSERT INTO lesson_transcripts (id, lesson_id, raw_text, segments, language) VALUES (${transcriptId}, ${lessonId}, ${allText}, ${JSON.stringify(allSegments)}::jsonb, 'ru')`);

    // 3. AI Analysis
    const segmentLines = allSegments.map((s: any) => {
      const time = `[${Math.floor(s.start / 60)}:${String(Math.floor(s.start % 60)).padStart(2, '0')}]`;
      if (s.speaker && s.speaker !== 'UNKNOWN') {
        return `${time} ${s.speaker}: ${s.text}`;
      }
      return `${time} ${s.text}`;
    }).join('\n');

    const studentRows = await q(sql, sql`SELECT name, level, goals FROM students WHERE id = ${resolvedStudentId} LIMIT 1`);
    const profile = studentRows[0] || {};
    const profileName = profile.name || studentName || 'Student';
    const profileLevel = profile.level || studentLevel || 'unknown (assess from transcript)';
    const profileGoals = profile.goals || studentGoals || 'General English improvement';

    const materialRows = await q(sql, sql`SELECT filename, category, content FROM materials WHERE tutor_id = ${DEMO_TUTOR_ID} ORDER BY created_at DESC`);
    const materialsText = materialsToPromptText(pickMaterials(materialRows as any, profileGoals, false));

    let trackInfo: string;
    const realHasMic = staged ? stagedHasMic : hasMic;
    const realHasSystem = staged ? stagedHasSystem : hasSystem;
    if (realHasMic && realHasSystem) {
      trackInfo = swapTracks
        ? `Audio sources: TWO TRACKS (Reverb mode) — Microphone = STUDENT, System audio = TEACHER. Speaker labels are already correct from the recording hardware.`
        : `Audio sources: TWO TRACKS — Microphone = TEACHER, System audio = STUDENT. Speaker labels are already correct from the recording hardware.`;
    } else if (realHasSystem && !realHasMic) {
      trackInfo = `Audio source: SYSTEM AUDIO ONLY (no microphone). This recording captures what plays through the student's speakers/headphones — the teacher's voice from the video call (Zoom/Meet/etc.) and any exercise audio.

HOW TO IDENTIFY SPEAKERS:
The TEACHER is the one who:
- Asks questions: "Tell me about yourself", "What do you do?", "Can you repeat?"
- Gives instructions: "Now read this", "Let's practice", "Try to use this word"
- Explains grammar/vocabulary: "We use present perfect when..."
- Provides feedback: "Good", "Excellent", "Not quite, let me explain"
- Guides the lesson flow: "Moving on to...", "Let's go back to..."
- Speaks with authority and control over the conversation

The STUDENT is the one who:
- Answers questions: "My name is...", "I think...", "Yes, I did"
- Reads aloud or practices: pronunciation exercises, reading texts
- Asks for clarification: "What does this mean?", "How do you say...?"
- Makes mistakes and gets corrected
- Speaks in Russian when thinking aloud or confused

LABEL: Use TEACHER: and STUDENT: prefixes on each line. If you truly cannot determine who is speaking, use UNKNOWN:.`;
    } else {
      trackInfo = `Audio source: Mixed (single track). Please identify TEACHER vs STUDENT from context.`;
    }

    const analysisPrompt = buildAnalysisPrompt({
      durationMinutes: Math.round(effectiveDuration / 60),
      studentName: profileName,
      studentLevel: profileLevel,
      studentGoals: profileGoals,
      trackInfo,
      segmentLines,
      materialsText: materialsText || undefined,
    });

    const analysisRes = await fetch('https://polza.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        messages: [
          { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: analysisPrompt },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    let analysis: any = {};
    if (analysisRes.ok) {
      const analysisData = await analysisRes.json();
      try {
        const content = analysisData.choices[0]?.message?.content || '{}';
        analysis = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
      } catch {
        analysis = { summary: analysisData.choices[0]?.message?.content || 'Analysis failed' };
      }
    } else {
      const errText = await analysisRes.text().catch(() => '');
      console.error('AI analysis failed:', analysisRes.status, analysisRes.status === 402 ? '(Polza balance exhausted — top up)' : '', errText.slice(0, 200));
    }

    // 4. Save analysis
    const analysisId = crypto.randomUUID();
    await q(sql, sql`INSERT INTO lesson_analyses (id, lesson_id, summary, topics, strengths, weaknesses, recurring_weaknesses, recommended_practice, next_lesson_recommendation, raw_ai_response, engagement_score, key_vocabulary, grammar_focus, student_level_assessment) VALUES (${analysisId}, ${lessonId}, ${analysis.summary || ''}, ${JSON.stringify(analysis.topics || [])}::jsonb, ${JSON.stringify(analysis.strengths || [])}::jsonb, ${JSON.stringify(analysis.weaknesses || [])}::jsonb, ${JSON.stringify(analysis.recurring_issues || [])}::jsonb, ${JSON.stringify(analysis.next_lesson_recommendation ? [analysis.next_lesson_recommendation] : [])}::jsonb, ${analysis.next_lesson_recommendation || ''}, ${JSON.stringify(analysis)}::jsonb, ${Number(analysis.engagement_score) || 0}, ${JSON.stringify(analysis.key_vocabulary || [])}::jsonb, ${JSON.stringify(analysis.grammar_focus || [])}::jsonb, ${JSON.stringify(analysis.student_level_assessment || null)}::jsonb)`);

    // 5. Pre-generate homework
    const homeworkQuestions = analysis.homework || [];
    if (homeworkQuestions.length > 0) {
      const homeworkId = crypto.randomUUID();
      const hwTitle = `Homework: ${(analysis.topics || []).join(', ') || 'Lesson Review'}`;
      await q(sql, sql`INSERT INTO homeworks (id, lesson_id, student_id, tutor_id, title, status) VALUES (${homeworkId}, ${lessonId}, ${resolvedStudentId}, ${DEMO_TUTOR_ID}, ${hwTitle}, 'draft')`);

      try {
        for (let i = 0; i < homeworkQuestions.length; i++) {
          const qQ = homeworkQuestions[i];
          const type = normalizeQuestionType(qQ.type, qQ.options);
          const { text, correctAnswer } = scrubHomeworkQuestion(qQ.question || '', qQ.correct_answer || '');
          const opts = normalizeHomeworkOptions(qQ.options, text);
          await q(sql, sql`INSERT INTO homework_questions (id, homework_id, type, question_text, options, correct_answer, explanation, sort_order) VALUES (${crypto.randomUUID()}, ${homeworkId}, ${type}, ${text}, ${JSON.stringify(opts)}::jsonb, ${correctAnswer}, ${qQ.explanation || ''}, ${i})`);
        }
      } catch (e: any) {
        console.error('Homework pre-generation failed:', e);
        await q(sql, sql`DELETE FROM homework_questions WHERE homework_id = ${homeworkId}`);
        await q(sql, sql`DELETE FROM homeworks WHERE id = ${homeworkId}`);
      }
    }

    // 6. Update lesson status
    await q(sql, sql`UPDATE lessons SET status = 'completed' WHERE id = ${lessonId}`);

    return NextResponse.json({
      lessonId,
      transcript: allText,
      segments: allSegments,
      dualTrack: realHasMic || realHasSystem,
      analysis: {
        teacher_student_transcript: analysis.teacher_student_transcript,
        summary: analysis.summary,
        topics: analysis.topics,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        key_vocabulary: analysis.key_vocabulary,
        grammar_focus: analysis.grammar_focus,
        keywords: analysis.keywords,
        next_lesson_recommendation: analysis.next_lesson_recommendation,
        student_level_assessment: analysis.student_level_assessment,
        engagement_score: analysis.engagement_score,
      },
    });
  } catch (error: any) {
    console.error('Process lesson error:', error.message, error.stack);
    // Try to mark lesson as failed
    try {
      await q(sql, sql`UPDATE lessons SET status = 'failed' WHERE id = ${lessonId}`);
    } catch {}
    return NextResponse.json({ error: error.message || 'Processing failed', lessonId }, { status: 500 });
  }
}

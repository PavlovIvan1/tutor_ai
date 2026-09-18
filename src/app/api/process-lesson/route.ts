import { NextRequest, NextResponse } from 'next/server';
import { getDb, isDbConfigured, q } from '@/lib/db';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

async function transcribeAudio(audioBase64: string, label: string): Promise<{ text: string; segments: any[] }> {
  const audioBuffer = Buffer.from(audioBase64, 'base64');

  if (audioBuffer.length < 100) {
    return { text: '', segments: [] };
  }

  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), `${label}.webm`);
  formData.append('model', 'whisper-1');
  formData.append('language', 'ru');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'segment');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown');
    console.error(`Whisper error (${label}):`, res.status, errText);
    throw new Error(`Whisper failed for ${label}: ${res.status}`);
  }

  const data = await res.json();
  return {
    text: data.text || '',
    segments: (data.segments || []).map((s: any) => ({
      start: s.start,
      end: s.end,
      text: s.text,
    })),
  };
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
  } = body;

  // Merge single + array forms
  const micBase64List: string[] = [...micChunks.filter((c: string) => c?.length > 100)];
  if (micAudioBase64?.length > 100) micBase64List.push(micAudioBase64);

  const systemBase64List: string[] = [...systemChunks.filter((c: string) => c?.length > 100)];
  if (systemAudioBase64?.length > 100) systemBase64List.push(systemAudioBase64);

  const hasMic = micBase64List.length > 0;
  const hasSystem = systemBase64List.length > 0;
  const hasLegacy = audioBase64 && audioBase64.length > 100;

  if (!hasMic && !hasSystem && !hasLegacy) {
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

  let lessonId = crypto.randomUUID();

  try {
    // 1. Create lesson record
    await q(sql, sql`INSERT INTO lessons (id, tutor_id, student_id, status, started_at, ended_at, duration_seconds) VALUES (${lessonId}, ${DEMO_TUTOR_ID}, ${resolvedStudentId}, 'processing', NOW(), NOW(), ${durationSeconds || 0})`);

    let allText = '';
    let allSegments: any[] = [];

    if (hasMic || hasSystem) {
      // DUAL TRACK MODE: transcribe separately, then merge
      let teacherSegments: any[] = [];
      let studentSegments: any[] = [];

      if (hasMic) {
        console.log(`Transcribing mic (teacher): ${micBase64List.length} chunk(s)...`);
        // Concatenate all mic chunks into one transcribe call if small enough
        // or transcribe each separately
        for (let i = 0; i < micBase64List.length; i++) {
          const micResult = await transcribeAudio(micBase64List[i], `teacher_mic_${i}`);
          const offset = i * 300; // rough offset per chunk
          teacherSegments.push(...micResult.segments.map((s) => ({ ...s, start: s.start + offset, end: s.end + offset })));
          console.log(`Mic chunk ${i}: ${micResult.segments.length} segments`);
        }
      }

      if (hasSystem) {
        console.log(`Transcribing system (student): ${systemBase64List.length} chunk(s)...`);
        for (let i = 0; i < systemBase64List.length; i++) {
          const sysResult = await transcribeAudio(systemBase64List[i], `student_system_${i}`);
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

    const trackInfo = (hasMic || hasSystem)
      ? `Audio sources: Microphone = TEACHER, System audio = STUDENT.`
      : `Audio source: Mixed (single track). Please identify TEACHER vs STUDENT from context.`;

    const analysisPrompt = `You are an expert English tutoring AI analyzing a ${Math.round((durationSeconds || 0) / 60)}-minute lesson.

Student: ${studentName || 'Student'}
Level: ${studentLevel || 'unknown'}
Goals: ${studentGoals || 'general English'}
${trackInfo}

Transcript (labeled):
${segmentLines}

Return JSON (no markdown):
{
  "teacher_student_transcript": "Full conversation with TEACHER: and STUDENT: labels on each line. If already labeled, keep the labels.",
  "summary": "2-3 sentence lesson summary",
  "topics": ["topics covered"],
  "strengths": ["what student did well"],
  "weaknesses": ["areas of struggle"],
  "key_vocabulary": ["new words taught"],
  "grammar_focus": ["grammar points"],
  "recurring_issues": ["patterns"],
  "next_lesson_recommendation": "what to cover next",
  "keywords": ["keywords"],
  "student_level_assessment": "level assessment",
  "engagement_score": 85,
  "homework": [
    {"type": "multiple_choice", "question": "...", "options": ["A","B","C","D"], "correct_answer": "B", "explanation": "..."},
    {"type": "fill_blank", "question": "...", "correct_answer": "...", "explanation": "..."},
    {"type": "short_answer", "question": "...", "correct_answer": "Open-ended", "explanation": "..."}
  ]
}`;

    const analysisRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Expert English tutoring analyst. Valid JSON only.' },
          { role: 'user', content: analysisPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
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
      console.error('AI analysis failed:', analysisRes.status);
    }

    // 4. Save analysis
    const analysisId = crypto.randomUUID();
    await q(sql, sql`INSERT INTO lesson_analyses (id, lesson_id, summary, topics, strengths, weaknesses, recurring_weaknesses, recommended_practice, next_lesson_recommendation, raw_ai_response) VALUES (${analysisId}, ${lessonId}, ${analysis.summary || ''}, ${JSON.stringify(analysis.topics || [])}::jsonb, ${JSON.stringify(analysis.strengths || [])}::jsonb, ${JSON.stringify(analysis.weaknesses || [])}::jsonb, ${JSON.stringify(analysis.recurring_issues || [])}::jsonb, ${JSON.stringify(analysis.next_lesson_recommendation ? [analysis.next_lesson_recommendation] : [])}::jsonb, ${analysis.next_lesson_recommendation || ''}, ${JSON.stringify(analysis)}::jsonb)`);

    // 5. Pre-generate homework
    const homeworkQuestions = analysis.homework || [];
    if (homeworkQuestions.length > 0) {
      const homeworkId = crypto.randomUUID();
      const hwTitle = `Homework: ${(analysis.topics || []).join(', ') || 'Lesson Review'}`;
      await q(sql, sql`INSERT INTO homeworks (id, lesson_id, student_id, tutor_id, title, status) VALUES (${homeworkId}, ${lessonId}, ${resolvedStudentId}, ${DEMO_TUTOR_ID}, ${hwTitle}, 'draft')`);

      for (let i = 0; i < homeworkQuestions.length; i++) {
        const qQ = homeworkQuestions[i];
        await q(sql, sql`INSERT INTO homework_questions (id, homework_id, type, question_text, options, correct_answer, explanation, sort_order) VALUES (${crypto.randomUUID()}, ${homeworkId}, ${qQ.type || 'multiple_choice'}, ${qQ.question || ''}, ${JSON.stringify(qQ.options || [])}::jsonb, ${qQ.correct_answer || ''}, ${qQ.explanation || ''}, ${i})`);
      }
    }

    // 6. Update lesson status
    await q(sql, sql`UPDATE lessons SET status = 'completed' WHERE id = ${lessonId}`);

    return NextResponse.json({
      lessonId,
      transcript: allText,
      segments: allSegments,
      dualTrack: hasMic || hasSystem,
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

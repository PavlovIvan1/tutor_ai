import type { StudentMemory, HomeworkAttempt } from '@/lib/types';

export interface AnalysisInput {
  transcript: string;
  studentLevel: string;
  studentGoals: string | null;
  previousAnalyses: any[];
  memories: StudentMemory[];
  homeworkAttempts: any[];
}

export interface AnalysisResult {
  summary: string;
  topics: string[];
  strengths: string[];
  weaknesses: string[];
  recurringWeaknesses: { topic: string; lesson_count: number; lesson_ids: string[] }[];
  recommendedPractice: string[];
  nextLessonRecommendation: string;
}

// Mock AI analysis for development
function mockAnalysis(input: AnalysisInput): AnalysisResult {
  const hasPresentPerfect = input.transcript.toLowerCase().includes('present perfect');
  const hasIrregularVerbs = input.transcript.toLowerCase().includes('irregular');

  return {
    summary: `The lesson focused on ${hasPresentPerfect ? 'Present Perfect vs Past Simple' : 'general English topics'}. The student showed understanding of basic concepts but needs more practice with ${hasPresentPerfect ? 'time expressions and verb forms' : 'recently covered topics'}. ${hasIrregularVerbs ? 'Irregular verb recall was identified as an area needing improvement.' : ''}`,
    topics: [
      ...(hasPresentPerfect ? ['Present Perfect vs Past Simple'] : ['General conversation']),
      ...(hasIrregularVerbs ? ['Irregular verbs'] : []),
      'Time expressions',
      'Speaking practice',
    ],
    strengths: [
      'Good vocabulary recall',
      'Active participation in conversation',
      'Asks relevant follow-up questions',
    ],
    weaknesses: [
      ...(hasPresentPerfect ? ['Present Perfect usage with time expressions'] : []),
      ...(hasIrregularVerbs ? ['Irregular verb forms'] : []),
      'Article usage in spontaneous speech',
    ],
    recurringWeaknesses: input.previousAnalyses.length > 0 ? [
      {
        topic: 'Present Perfect',
        lesson_count: Math.min(input.previousAnalyses.length + 1, 4),
        lesson_ids: input.previousAnalyses.slice(0, 3).map((a) => a.lesson_id),
      },
    ] : [],
    recommendedPractice: [
      '5-minute speaking exercise on Present Perfect',
      'Fill-in-the-blank exercises with time expressions',
      'Irregular verb drill (10 common verbs)',
      'Listening comprehension with Present Perfect examples',
    ],
    nextLessonRecommendation: `Focus on reinforcing ${hasPresentPerfect ? 'Present Perfect with "already", "yet", and "ever"' : 'the topics covered this lesson'}. Include more speaking practice to build confidence. Review irregular verbs from this session.`,
  };
}

// Real OpenAI implementation
async function realAnalysis(input: AnalysisInput): Promise<AnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('No OpenAI API key configured');
  }

  const systemPrompt = `You are an AI assistant for English language tutors. Analyze the lesson transcript and provide structured feedback.

Student level: ${input.studentLevel}
Student goals: ${input.studentGoals || 'General English improvement'}

Previous lesson analyses (most recent first):
${input.previousAnalyses.map((a, i) => `Lesson ${i + 1}: ${a.summary}`).join('\n') || 'No previous lessons'}

Student memories:
${input.memories.map((m) => `- [${m.category}] ${m.content}`).join('\n') || 'No memories yet'}

Respond with valid JSON only. No markdown, no code blocks.`;

  const userPrompt = `Analyze this lesson transcript:

${input.transcript}

Return JSON with this exact structure:
{
  "summary": "2-3 sentence lesson summary",
  "topics": ["topic1", "topic2"],
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "recurringWeaknesses": [{"topic": "...", "lesson_count": 1, "lesson_ids": []}],
  "recommendedPractice": ["practice1", "practice2"],
  "nextLessonRecommendation": "..."
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error('AI analysis failed');
  }

  const data = await response.json();
  const content = JSON.parse(data.choices[0].message.content);

  return {
    summary: content.summary || '',
    topics: content.topics || [],
    strengths: content.strengths || [],
    weaknesses: content.weaknesses || [],
    recurringWeaknesses: content.recurringWeaknesses || [],
    recommendedPractice: content.recommendedPractice || [],
    nextLessonRecommendation: content.nextLessonRecommendation || '',
  };
}

// Factory function
export async function analyzeLesson(input: AnalysisInput): Promise<AnalysisResult> {
  if (process.env.OPENAI_API_KEY) {
    try {
      return await realAnalysis(input);
    } catch (error) {
      console.error('Real AI analysis failed, falling back to mock:', error);
      return mockAnalysis(input);
    }
  }

  console.log('⚠️ No API key found. Using mock AI analysis.');
  return mockAnalysis(input);
}

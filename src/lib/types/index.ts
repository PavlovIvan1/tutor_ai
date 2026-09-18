export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  tutor_id: string;
  name: string;
  email: string | null;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  goals: string | null;
  notes: string | null;
  lesson_day: string | null;
  lesson_time: string | null;
  lesson_duration: number | null;
  price_per_lesson: number | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export type LessonStatus = 'draft' | 'recording' | 'processing' | 'completed' | 'failed';

export interface Lesson {
  id: string;
  tutor_id: string;
  student_id: string;
  status: LessonStatus;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  audio_url: string | null;
  created_at: string;
  updated_at: string;
  student?: Student;
}

export interface LessonTranscript {
  id: string;
  lesson_id: string;
  raw_text: string | null;
  segments: TranscriptSegment[];
  language: string;
  created_at: string;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface LessonAnalysis {
  id: string;
  lesson_id: string;
  summary: string | null;
  topics: string[];
  strengths: string[];
  weaknesses: string[];
  recurring_weaknesses: RecurringWeakness[];
  recommended_practice: string[];
  next_lesson_recommendation: string | null;
  raw_ai_response: Record<string, unknown> | null;
  created_at: string;
}

export interface RecurringWeakness {
  topic: string;
  lesson_count: number;
  lesson_ids: string[];
}

export type MemoryCategory = 'weakness' | 'strength' | 'pattern' | 'note';

export interface StudentMemory {
  id: string;
  student_id: string;
  category: MemoryCategory;
  content: string;
  first_detected_at: string | null;
  last_reinforced_at: string | null;
  lesson_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type HomeworkStatus = 'draft' | 'sent' | 'completed';

export interface Homework {
  id: string;
  lesson_id: string;
  student_id: string;
  tutor_id: string;
  title: string | null;
  status: HomeworkStatus;
  sent_at: string | null;
  completed_at: string | null;
  score: number | null;
  created_at: string;
  updated_at: string;
  questions?: HomeworkQuestion[];
  student?: Student;
}

export type QuestionType = 'multiple_choice' | 'fill_blank' | 'short_answer';

export interface HomeworkQuestion {
  id: string;
  homework_id: string;
  type: QuestionType;
  question_text: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
  sort_order: number;
  created_at: string;
}

export interface HomeworkAttempt {
  id: string;
  homework_id: string;
  student_id: string;
  answers: HomeworkAnswer[];
  score: number | null;
  completed_at: string;
}

export interface HomeworkAnswer {
  question_id: string;
  answer: string;
  is_correct: boolean;
}

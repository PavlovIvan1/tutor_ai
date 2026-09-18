-- ============================================
-- TutorAI Database Schema
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users or standalone)
-- ============================================
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- SUBSCRIPTIONS
-- ============================================
create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('starter', 'pro', 'power')),
  ai_minutes_used integer default 0,
  ai_minutes_total integer not null,
  expires_at timestamptz,
  yookassa_payment_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- STUDENTS
-- ============================================
create table if not exists public.students (
  id uuid primary key default uuid_generate_v4(),
  tutor_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  email text,
  level text not null default 'A1' check (level in ('A1','A2','B1','B2','C1','C2')),
  goals text,
  notes text,
  lesson_day text,
  lesson_time text,
  lesson_duration integer,
  price_per_lesson integer,
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- LESSONS
-- ============================================
create table if not exists public.lessons (
  id uuid primary key default uuid_generate_v4(),
  tutor_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','recording','processing','completed','failed')),
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  audio_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- LESSON TRANSCRIPTS
-- ============================================
create table if not exists public.lesson_transcripts (
  id uuid primary key default uuid_generate_v4(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  raw_text text,
  segments jsonb default '[]'::jsonb,
  language text default 'en',
  created_at timestamptz default now()
);

-- ============================================
-- LESSON ANALYSES
-- ============================================
create table if not exists public.lesson_analyses (
  id uuid primary key default uuid_generate_v4(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  summary text,
  topics jsonb default '[]'::jsonb,
  strengths jsonb default '[]'::jsonb,
  weaknesses jsonb default '[]'::jsonb,
  recurring_weaknesses jsonb default '[]'::jsonb,
  recommended_practice jsonb default '[]'::jsonb,
  next_lesson_recommendation text,
  raw_ai_response jsonb,
  created_at timestamptz default now()
);

-- ============================================
-- STUDENT MEMORIES (AI long-term memory)
-- ============================================
create table if not exists public.student_memories (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  category text not null check (category in ('weakness','strength','pattern','note')),
  content text not null,
  first_detected_at timestamptz,
  last_reinforced_at timestamptz,
  lesson_count integer default 1,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- HOMEWORKS
-- ============================================
create table if not exists public.homeworks (
  id uuid primary key default uuid_generate_v4(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  tutor_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  status text not null default 'draft' check (status in ('draft','sent','completed')),
  sent_at timestamptz,
  completed_at timestamptz,
  score numeric(5,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- HOMEWORK QUESTIONS
-- ============================================
create table if not exists public.homework_questions (
  id uuid primary key default uuid_generate_v4(),
  homework_id uuid not null references public.homeworks(id) on delete cascade,
  type text not null check (type in ('multiple_choice','fill_blank','short_answer')),
  question_text text not null,
  options jsonb,
  correct_answer text not null,
  explanation text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- ============================================
-- HOMEWORK ATTEMPTS (student submissions)
-- ============================================
create table if not exists public.homework_attempts (
  id uuid primary key default uuid_generate_v4(),
  homework_id uuid not null references public.homeworks(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  answers jsonb default '[]'::jsonb,
  score numeric(5,2),
  completed_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index if not exists idx_students_tutor on public.students(tutor_id);
create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_lessons_tutor on public.lessons(tutor_id);
create index if not exists idx_lessons_student on public.lessons(student_id);
create index if not exists idx_lesson_transcripts_lesson on public.lesson_transcripts(lesson_id);
create index if not exists idx_lesson_analyses_lesson on public.lesson_analyses(lesson_id);
create index if not exists idx_student_memories_student on public.student_memories(student_id);
create index if not exists idx_homeworks_lesson on public.homeworks(lesson_id);
create index if not exists idx_homeworks_student on public.homeworks(student_id);
create index if not exists idx_homework_questions_homework on public.homework_questions(homework_id);
create index if not exists idx_homework_attempts_homework on public.homework_attempts(homework_id);

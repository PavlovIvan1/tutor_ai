'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import EmptyState from '@/components/ui/EmptyState';
import { createClient } from '@/lib/supabase/client';
import { getInitials, getLevelColor, formatDate } from '@/lib/utils';
import type { Student, Lesson, StudentMemory } from '@/lib/types';

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [memories, setMemories] = useState<StudentMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('id', params.id)
        .single();

      if (studentData) {
        setStudent(studentData);

        const { data: lessonsData } = await supabase
          .from('lessons')
          .select('*, student:students(*)')
          .eq('student_id', params.id)
          .order('created_at', { ascending: false });

        setLessons(lessonsData || []);

        const { data: memoriesData } = await supabase
          .from('student_memories')
          .select('*')
          .eq('student_id', params.id)
          .eq('is_active', true)
          .order('lesson_count', { ascending: false });

        setMemories(memoriesData || []);
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!student) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-ink-secondary">Student not found.</p>
        </div>
      </DashboardLayout>
    );
  }

  const completedLessons = lessons.filter((l) => l.status === 'completed');

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center text-brand-dark font-black text-xl">
            {getInitials(student.name)}
          </div>
          <div>
            <h1 className="text-3xl font-black text-ink">{student.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getLevelColor(student.level)}>{student.level}</Badge>
              {student.goals && (
                <span className="text-sm text-ink-secondary">{student.goals}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/lessons/new?student=${student.id}`}
            className="inline-flex items-center gap-2 px-5 py-3 bg-brand text-white font-bold rounded-2xl shadow-[0_4px_0_0_var(--brand-shadow)] hover:bg-brand-dark transition-all text-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
            </svg>
            Start Lesson
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-ink mb-4">Progress</h2>
            {completedLessons.length < 3 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-ink-secondary">
                  Complete a few lessons to start building this student&apos;s profile.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-bold text-ink-secondary">Grammar</span>
                    <span className="text-sm font-bold text-brand">72%</span>
                  </div>
                  <ProgressBar value={72} color="brand" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-bold text-ink-secondary">Vocabulary</span>
                    <span className="text-sm font-bold text-sky">85%</span>
                  </div>
                  <ProgressBar value={85} color="sky" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-bold text-ink-secondary">Speaking</span>
                    <span className="text-sm font-bold text-coral">58%</span>
                  </div>
                  <ProgressBar value={58} color="coral" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-bold text-ink-secondary">Listening</span>
                    <span className="text-sm font-bold text-honey">78%</span>
                  </div>
                  <ProgressBar value={78} color="honey" />
                </div>
              </div>
            )}
          </Card>

          {/* Lesson History */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-ink mb-4">Lesson History</h2>
            {lessons.length === 0 ? (
              <EmptyState
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  </svg>
                }
                title="No lessons yet"
                description="Start a lesson with this student to begin building their profile."
              />
            ) : (
              <div className="space-y-3">
                {lessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    href={`/lessons/${lesson.id}`}
                    className="flex items-center justify-between p-4 rounded-2xl border border-surface-border hover:border-brand/30 hover:bg-brand-light/30 transition-all"
                  >
                    <div>
                      <p className="text-sm font-bold text-ink">{formatDate(lesson.created_at)}</p>
                      <p className="text-xs text-ink-secondary mt-0.5">
                        {lesson.duration_seconds ? `${Math.round(lesson.duration_seconds / 60)} min` : 'In progress'}
                      </p>
                    </div>
                    <Badge variant={lesson.status === 'completed' ? 'success' : lesson.status === 'processing' ? 'warning' : 'default'}>
                      {lesson.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Schedule Card */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-ink mb-4">Расписание</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-secondary">День</span>
                <span className="text-sm font-bold text-ink">{student.lesson_day || 'Не задан'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-secondary">Время</span>
                <span className="text-sm font-bold text-ink">{student.lesson_time || 'Не задано'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-secondary">Длительность</span>
                <span className="text-sm font-bold text-ink">{student.lesson_duration ? `${student.lesson_duration} мин` : 'Не задана'}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-surface-border">
                <span className="text-sm text-ink-secondary">Стоимость</span>
                <span className="text-sm font-black text-brand">{student.price_per_lesson ? `${student.price_per_lesson.toLocaleString()} ₽` : 'Не задана'}</span>
              </div>
            </div>
          </Card>

          {/* Recurring Weaknesses */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-ink mb-4">Recurring Weaknesses</h2>
            {memories.filter((m) => m.category === 'weakness').length === 0 ? (
              <p className="text-sm text-ink-secondary py-4 text-center">
                Weaknesses will appear here after AI analysis of lessons.
              </p>
            ) : (
              <div className="space-y-3">
                {memories
                  .filter((m) => m.category === 'weakness')
                  .map((memory) => (
                    <div key={memory.id} className="p-3 rounded-xl bg-coral/5 border border-coral/10">
                      <p className="text-sm font-bold text-ink">{memory.content}</p>
                      <p className="text-xs text-ink-muted mt-1">
                        Detected in {memory.lesson_count} lesson{memory.lesson_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </Card>

          {/* AI Memory */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-ink mb-4">
              <span className="inline-flex items-center gap-2">
                AI Memory
                <span className="px-2 py-0.5 rounded-full bg-brand text-white text-[10px] font-black">AI</span>
              </span>
            </h2>
            {memories.length === 0 ? (
              <p className="text-sm text-ink-secondary py-4 text-center">
                The AI will build a memory profile of this student as you complete lessons together.
              </p>
            ) : (
              <div className="space-y-2">
                {memories.map((memory) => (
                  <div key={memory.id} className="flex items-start gap-2 p-3 rounded-xl bg-surface-tinted">
                    <span className="mt-0.5">
                      {memory.category === 'weakness' && '⚠️'}
                      {memory.category === 'strength' && '✅'}
                      {memory.category === 'pattern' && '🔄'}
                      {memory.category === 'note' && '📝'}
                    </span>
                    <p className="text-sm text-ink">{memory.content}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Notes */}
          {student.notes && (
            <Card className="p-6">
              <h2 className="text-lg font-bold text-ink mb-4">Notes</h2>
              <p className="text-sm text-ink-secondary whitespace-pre-wrap">{student.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

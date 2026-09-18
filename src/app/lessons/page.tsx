'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { getInitials, getLevelColor } from '@/lib/utils';

interface LessonWithDetails {
  id: string;
  status: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  student_name: string;
  student_level: string;
  analysis_summary: string;
  analysis_topics: string | any[];
  homework_id: string | null;
}

export default function LessonsPage() {
  const [lessons, setLessons] = useState<LessonWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const res = await fetch(`/api/lessons?tutor_id=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setLessons(data.lessons || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-ink">Уроки</h1>
            <p className="text-ink-secondary mt-1">Все ваши записанные уроки с анализом.</p>
          </div>
          <Link href="/lessons/new">
            <Button>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
              </svg>
              Новый урок
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : lessons.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-tinted flex items-center justify-center text-ink-muted">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-ink mb-2">Пока нет уроков</h2>
            <p className="text-sm text-ink-secondary mb-6">Запишите первый урок, чтобы начать анализ</p>
            <Link href="/lessons/new">
              <Button>Записать урок</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson) => {
              const topics = typeof lesson.analysis_topics === 'string'
                ? JSON.parse(lesson.analysis_topics || '[]')
                : lesson.analysis_topics || [];

              return (
                <Link key={lesson.id} href={`/lessons/${lesson.id}`}>
                  <Card className="p-5 hover:shadow-card transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-brand-light flex items-center justify-center text-brand-dark font-bold flex-shrink-0">
                        {getInitials(lesson.student_name || '?')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-ink truncate">{lesson.student_name || 'Student'}</p>
                          {lesson.student_level && (
                            <Badge className={getLevelColor(lesson.student_level)}>{lesson.student_level}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-ink-secondary truncate mt-0.5">
                          {lesson.analysis_summary || 'Обработка...'}
                        </p>
                        {topics.length > 0 && (
                          <div className="flex gap-1.5 mt-2">
                            {topics.slice(0, 3).map((t: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 rounded-full bg-surface-tinted text-ink-secondary text-xs">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {lesson.homework_id ? (
                          <span className="px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold">Домашка ✓</span>
                        ) : lesson.status === 'completed' ? (
                          <span className="px-3 py-1 rounded-full bg-honey/10 text-honey text-xs font-bold">Без домашки</span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-surface-tinted text-ink-muted text-xs font-bold capitalize">{lesson.status}</span>
                        )}
                        <div className="text-right">
                          <p className="text-xs text-ink-muted">
                            {lesson.started_at ? new Date(lesson.started_at).toLocaleDateString('ru-RU') : ''}
                          </p>
                          {lesson.duration_seconds > 0 && (
                            <p className="text-xs text-ink-muted">{Math.floor(lesson.duration_seconds / 60)} мин</p>
                          )}
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted flex-shrink-0">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { mockStore, plans } from '@/lib/mock-store';
import type { Subscription } from '@/lib/mock-store';
import { createClient } from '@/lib/supabase/client';
import { getInitials, getLevelColor } from '@/lib/utils';

export default function DashboardPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [stats, setStats] = useState({ students: 0, lessonsThisWeek: 0, pendingHomework: 0, needsAttention: 0 });
  const [recentLessons, setRecentLessons] = useState<any[]>([]);
  const [lessonsWithoutHomework, setLessonsWithoutHomework] = useState<any[]>([]);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  useEffect(() => {
    const { data } = mockStore.subscription.get();
    setSubscription(data);
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Students count
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('tutor_id', user.id)
        .eq('is_archived', false);

      // Fetch lessons from API
      const res = await fetch(`/api/lessons?tutor_id=${user.id}`);
      let allLessons: any[] = [];
      if (res.ok) {
        const data = await res.json();
        allLessons = data.lessons || [];
      }

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lessonsThisWeek = allLessons.filter((l: any) => new Date(l.created_at) >= weekAgo);

      const withoutHomework = allLessons.filter((l: any) => l.status === 'completed' && !l.homework_id);
      const needsAttention = withoutHomework.slice(0, 5);

      setStats({
        students: students?.length || 0,
        lessonsThisWeek: lessonsThisWeek.length,
        pendingHomework: withoutHomework.length,
        needsAttention: needsAttention.length,
      });

      setRecentLessons(allLessons.slice(0, 5));
      setLessonsWithoutHomework(withoutHomework.slice(0, 5));
    }
    load();
  }, []);

  const currentPlan = subscription?.plan ? plans.find((p) => p.id === subscription.plan) : null;
  const usagePercent = subscription ? Math.round((subscription.ai_minutes_used / subscription.ai_minutes_total) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-ink">Dashboard</h1>
        <p className="text-ink-secondary mt-1">Welcome back. Here&apos;s your teaching overview.</p>
      </div>

      {/* Subscription Status */}
      {currentPlan ? (
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-ink">{currentPlan.name} Plan</h2>
              <p className="text-sm text-ink-secondary">{currentPlan.priceFormatted}/месяц</p>
            </div>
            <Link href="/subscribe" className="text-sm font-bold text-brand hover:underline">Управление</Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="w-full h-3 rounded-full bg-surface-tinted overflow-hidden">
                <div className="h-full rounded-full bg-brand animate-progress" style={{ width: `${usagePercent}%` }} />
              </div>
            </div>
            <span className="text-sm font-black text-ink whitespace-nowrap">
              {subscription!.ai_minutes_used.toLocaleString()} / {subscription!.ai_minutes_total.toLocaleString()} AI мин
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-2 text-right">
            {subscription!.ai_minutes_total - subscription!.ai_minutes_used} мин осталось
          </p>
        </Card>
      ) : (
        <Card className="p-6 mb-8 border-brand/30 bg-brand-light/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink">Нет активной подписки</h2>
              <p className="text-sm text-ink-secondary">Выберите тариф для использования AI-анализа</p>
            </div>
            <Link href="/subscribe" className="px-5 py-3 bg-brand text-white font-bold rounded-2xl shadow-[0_4px_0_0_#2E7D32] hover:brightness-110 active:shadow-none active:translate-y-1 transition-all text-sm">
              Выбрать тариф
            </Link>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Ученики</p>
          <p className="text-3xl font-black text-ink mt-2">{stats.students}</p>
          <p className="text-xs text-ink-muted mt-1">{stats.students === 0 ? 'Добавьте первого ученика' : 'Активных учеников'}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Уроки за неделю</p>
          <p className="text-3xl font-black text-ink mt-2">{stats.lessonsThisWeek}</p>
          <p className="text-xs text-ink-muted mt-1">{stats.lessonsThisWeek === 0 ? 'Запишите первый урок' : 'Обработано уроков'}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Без домашки</p>
          <p className="text-3xl font-black text-ink mt-2">{stats.pendingHomework}</p>
          <p className="text-xs text-ink-muted mt-1">{stats.pendingHomework === 0 ? 'Все домашки сгенерированы' : 'Нужно сгенерировать'}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Внимание</p>
          <p className="text-3xl font-black text-ink mt-2">{stats.needsAttention}</p>
          <p className="text-xs text-ink-muted mt-1">{stats.needsAttention === 0 ? 'Всё в порядке' : 'Уроки без домашки'}</p>
        </Card>
      </div>

      {/* Lessons Without Homework — Generate Button */}
      {lessonsWithoutHomework.length > 0 && (
        <Card className="p-6 mb-8 border-honey/30 bg-honey/5">
          <h2 className="text-lg font-bold text-ink mb-1">Последние уроки без домашки</h2>
          <p className="text-sm text-ink-secondary mb-4">Сгенерируйте домашнее задание для уроков</p>
          <div className="space-y-3">
            {lessonsWithoutHomework.map((lesson) => (
              <div key={lesson.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-surface-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center text-brand-dark font-bold text-xs">
                    {getInitials(lesson.student_name || '?')}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink">{lesson.student_name || 'Student'}</p>
                    <p className="text-xs text-ink-muted">{lesson.started_at ? new Date(lesson.started_at).toLocaleDateString('ru-RU') : ''}</p>
                  </div>
                </div>
                <Link href={`/lessons/${lesson.id}`} className="px-4 py-2 bg-brand text-white font-bold rounded-xl text-xs shadow-[0_3px_0_0_#2E7D32] hover:brightness-110 active:shadow-none active:translate-y-[2px] transition-all">
                  Сгенерировать
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-bold text-ink mb-4">Quick Start</h2>
          <p className="text-sm text-ink-secondary mb-4">Begin a lesson recording with one of your students.</p>
          <Link href="/lessons/new" className="inline-flex items-center gap-2 px-5 py-3 bg-brand text-white font-bold rounded-2xl shadow-[0_4px_0_0_var(--brand-shadow)] hover:bg-brand-dark transition-all active:translate-y-[2px] active:shadow-none text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
            </svg>
            Start Lesson
          </Link>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-ink mb-4">Последние уроки</h2>
          {recentLessons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-surface-tinted flex items-center justify-center text-ink-muted mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                </svg>
              </div>
              <p className="text-sm font-bold text-ink">No lessons yet</p>
              <p className="text-xs text-ink-secondary mt-1">Your lesson history will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLessons.slice(0, 4).map((lesson: any) => (
                <Link key={lesson.id} href={`/lessons/${lesson.id}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-tinted transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center text-brand-dark font-bold text-xs">
                    {getInitials(lesson.student_name || '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{lesson.student_name || 'Student'}</p>
                    <p className="text-xs text-ink-muted truncate">{lesson.analysis_summary || lesson.status}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-ink-muted">{lesson.started_at ? new Date(lesson.started_at).toLocaleDateString('ru-RU') : ''}</p>
                    {lesson.homework_id && (
                      <span className="text-xs text-brand font-bold">Домашка ✓</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

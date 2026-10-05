'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import { mockStore, planById, lessonLimit, lessonsLeft } from '@/lib/mock-store';
import type { Subscription } from '@/lib/mock-store';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-ink-secondary">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
            <p className="text-ink-secondary mt-1">Welcome back! Here&apos;s your teaching overview.</p>
          </div>
          <Link
            href="/dev"
            className="shrink-0 text-sm font-bold text-brand bg-brand-light hover:bg-brand/20 px-4 py-2 rounded-xl transition-colors"
          >
            Dev · загрузить урок
          </Link>
        </div>

        <StatsGrid />
        <LessonsProgress />
        <StudentsSection />
        <RecentLessonsSection />
        <NeedsHomeworkSection />
      </div>
    </DashboardLayout>
  );
}

function StatsGrid() {
  const [stats, setStats] = useState({ totalStudents: 0, lessonsThisWeek: 0, totalLessons: 0, pendingHomework: 0 });

  useEffect(() => {
    fetch('/api/stats').then(r => r.ok ? r.json() : null).then(d => d && setStats(d.stats)).catch(() => {});
  }, []);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-5">
        <p className="text-sm text-ink-secondary mb-1">Students</p>
        <p className="text-3xl font-bold text-ink">{stats.totalStudents}</p>
      </Card>
      <Card className="p-5">
        <p className="text-sm text-ink-secondary mb-1">Lessons This Week</p>
        <p className="text-3xl font-bold text-ink">{stats.lessonsThisWeek}</p>
      </Card>
      <Card className="p-5">
        <p className="text-sm text-ink-secondary mb-1">Total Lessons</p>
        <p className="text-3xl font-bold text-ink">{stats.totalLessons}</p>
      </Card>
      <Card className="p-5">
        <p className="text-sm text-ink-secondary mb-1">Pending Homework</p>
        <p className="text-3xl font-bold text-coral">{stats.pendingHomework}</p>
      </Card>
    </div>
  );
}

function LessonsProgress() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    const { data } = mockStore.subscription.get();
    setSubscription(data);
  }, []);

  const used = subscription?.lessons_used || 0;
  const total = lessonLimit(subscription);
  const left = lessonsLeft(subscription);
  const percent = total > 0 ? Math.round((used / total) * 100) : 0;
  const planName = planById(subscription?.plan || null)?.name || 'Бесплатный тариф';
  const expiresLabel = subscription?.plan && subscription?.expires_at
    ? `до ${new Date(subscription.expires_at).toLocaleDateString('ru-RU')}`
    : null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-ink">Уроки</h2>
          <span className="px-2.5 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-bold">{planName}</span>
        </div>
        <span className="text-sm text-ink-secondary">{used} / {total} использовано</span>
      </div>
      <div className="w-full h-3 bg-surface-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percent}%`,
            background: percent >= 100 ? 'var(--coral)' : percent > 50 ? '#F59E0B' : 'var(--brand)',
          }}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-ink-secondary">
          {left} уроков осталось{expiresLabel ? ` · подписка на ${subscription?.period === 'year' ? 'год' : 'месяц'}, ${expiresLabel}` : ''}
        </p>
        <Link href="/subscribe" className="text-xs font-bold text-brand hover:underline">
          {left > 0 ? 'Сменить тариф' : 'Продолжить'}
        </Link>
      </div>
    </Card>
  );
}

function StudentsSection() {
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/stats').then(r => r.ok ? r.json() : null).then(d => d && setStudents(d.students || [])).catch(() => {});
  }, []);

  if (students.length === 0) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-ink">Students</h2>
        <Link href="/students" className="text-sm font-bold text-brand hover:underline">View all</Link>
      </div>
      <div className="space-y-3">
        {students.map((s) => (
          <Link key={s.id} href={`/students/${s.id}`} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-secondary transition-colors">
            <div className="w-10 h-10 rounded-xl bg-surface-tinted flex items-center justify-center text-sm font-bold text-brand">
              {s.name?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-ink text-sm truncate">{s.name}</p>
              <p className="text-xs text-ink-secondary">{s.lessonCount} lessons</p>
            </div>
            <span className="text-xs font-bold text-ink-secondary">{s.level}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function RecentLessonsSection() {
  const [lessons, setLessons] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/stats').then(r => r.ok ? r.json() : null).then(d => d && setLessons(d.recentLessons || [])).catch(() => {});
  }, []);

  if (lessons.length === 0) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-ink">Recent Lessons</h2>
        <Link href="/lessons" className="text-sm font-bold text-brand hover:underline">View all</Link>
      </div>
      <div className="space-y-2">
        {lessons.map((l) => (
          <Link key={l.id} href={`/lessons/${l.id}`} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-secondary transition-colors">
            <div className="w-10 h-10 rounded-xl bg-surface-tinted flex items-center justify-center text-sm">
              {l.status === 'completed' ? '✅' : l.status === 'processing' ? '⏳' : '❌'}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-ink text-sm">{l.student_name || 'Student'}</span>
              <p className="text-xs text-ink-secondary truncate">{l.summary || l.status}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-ink-secondary">{l.duration_seconds ? `${Math.round(l.duration_seconds / 60)}m` : '—'}</span>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function NeedsHomeworkSection() {
  const [lessons, setLessons] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/stats').then(r => r.ok ? r.json() : null).then(d => d && setLessons(d.lessonsWithoutHomework || [])).catch(() => {});
  }, []);

  if (lessons.length === 0) return null;

  return (
    <Card className="p-6 border-coral/20">
      <h2 className="text-lg font-bold text-ink mb-4">Needs Homework</h2>
      <div className="space-y-2">
        {lessons.map((l) => (
          <div key={l.id} className="flex items-center justify-between p-3 rounded-2xl bg-coral/5">
            <div>
              <span className="font-bold text-ink text-sm">{l.student_name || 'Student'}</span>
              <p className="text-xs text-ink-secondary">{new Date(l.created_at).toLocaleDateString()}</p>
            </div>
            <Link href={`/lessons/${l.id}`} className="text-sm font-bold text-brand hover:underline">Generate HW</Link>
          </div>
        ))}
      </div>
    </Card>
  );
}

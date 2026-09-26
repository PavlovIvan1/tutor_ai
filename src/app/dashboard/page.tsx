'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import { mockStore, plans } from '@/lib/mock-store';
import type { Subscription } from '@/lib/mock-store';

export default function DashboardPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data } = mockStore.subscription.get();
    setSubscription(data);
    setLoading(false);
  }, []);

  const hasSubscription = subscription?.plan != null;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-ink-secondary">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!hasSubscription) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
            <p className="text-ink-secondary mt-1">Welcome back! Here&apos;s your teaching overview.</p>
          </div>

          <Card className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-brand-light flex items-center justify-center mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h2 className="text-xl font-black text-ink mb-2">Подключите подписку</h2>
            <p className="text-sm text-ink-secondary max-w-md mb-8">
              Чтобы использовать AI-анализ уроков, вести учеников и генерировать домашние задания, выберите тарифный план.
            </p>
            <Link
              href="/subscribe"
              className="px-8 py-4 bg-brand text-white font-bold rounded-2xl shadow-[0_4px_0_0_#2E7D32] hover:brightness-110 active:shadow-none active:translate-y-1 transition-all text-base"
            >
              Выбрать тариф
            </Link>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
          <p className="text-ink-secondary mt-1">Welcome back! Here&apos;s your teaching overview.</p>
        </div>

        <StatsGrid />
        <AIMinutesProgress />
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

function AIMinutesProgress() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    const { data } = mockStore.subscription.get();
    setSubscription(data);
  }, []);

  const aiUsed = subscription?.ai_minutes_used || 0;
  const aiTotal = subscription?.ai_minutes_total || 500;
  const aiPercent = aiTotal > 0 ? Math.round((aiUsed / aiTotal) * 100) : 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-ink">AI Minutes</h2>
        <span className="text-sm text-ink-secondary">{aiUsed} / {aiTotal} min used</span>
      </div>
      <div className="w-full h-3 bg-surface-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${aiPercent}%`,
            background: aiPercent > 80 ? 'var(--coral)' : aiPercent > 50 ? '#F59E0B' : 'var(--brand)',
          }}
        />
      </div>
      <p className="text-xs text-ink-secondary mt-2">{aiTotal - aiUsed} minutes remaining</p>
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

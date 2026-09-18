'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { useState, useEffect } from 'react';
import { mockStore, plans } from '@/lib/mock-store';
import type { Subscription } from '@/lib/mock-store';

export default function DashboardPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    const { data } = mockStore.subscription.get();
    setSubscription(data);
  }, []);

  const currentPlan = subscription?.plan ? plans.find((p) => p.id === subscription.plan) : null;
  const usagePercent = subscription ? Math.round((subscription.ai_minutes_used / subscription.ai_minutes_total) * 100) : 0;

  return (
    <DashboardLayout>
      {/* Header */}
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
            <Link href="/subscribe" className="text-sm font-bold text-brand hover:underline">
              Управление
            </Link>
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
            <Link
              href="/subscribe"
              className="px-5 py-3 bg-brand text-white font-bold rounded-2xl shadow-[0_4px_0_0_#2E7D32] hover:brightness-110 active:shadow-none active:translate-y-1 transition-all text-sm"
            >
              Выбрать тариф
            </Link>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Total Students</p>
          <p className="text-3xl font-black text-ink mt-2">0</p>
          <p className="text-xs text-ink-muted mt-1">Add your first student</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Lessons This Week</p>
          <p className="text-3xl font-black text-ink mt-2">0</p>
          <p className="text-xs text-ink-muted mt-1">Start a lesson to begin</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Pending Homework</p>
          <p className="text-3xl font-black text-ink mt-2">0</p>
          <p className="text-xs text-ink-muted mt-1">No pending homework</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Students Need Attention</p>
          <p className="text-3xl font-black text-ink mt-2">0</p>
          <p className="text-xs text-ink-muted mt-1">Complete lessons to track</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Start Lesson */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-ink mb-4">Quick Start</h2>
          <p className="text-sm text-ink-secondary mb-4">Begin a lesson recording with one of your students.</p>
          <Link
            href="/lessons/new"
            className="inline-flex items-center gap-2 px-5 py-3 bg-brand text-white font-bold rounded-2xl shadow-[0_4px_0_0_var(--brand-shadow)] hover:bg-brand-dark transition-all active:translate-y-[2px] active:shadow-none text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
            </svg>
            Start Lesson
          </Link>
        </Card>

        {/* Recent Lessons */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-ink mb-4">Recent Lessons</h2>
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
        </Card>

        {/* Students Needing Attention */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-ink mb-4">Students Needing Attention</h2>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-surface-tinted flex items-center justify-center text-ink-muted mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <p className="text-sm font-bold text-ink">All clear</p>
            <p className="text-xs text-ink-secondary mt-1">Students who need attention will appear here after lessons</p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { mockStore, plans } from '@/lib/mock-store';
import type { Subscription } from '@/lib/mock-store';

export default function SettingsPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const { data } = mockStore.subscription.get();
    setSubscription(data);
    const { data: userData } = mockStore.auth.getUser();
    if (userData?.user) setUser(userData.user);
  }, []);

  const currentPlan = subscription?.plan ? plans.find((p) => p.id === subscription.plan) : null;

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-ink">Settings</h1>
          <p className="text-ink-secondary mt-1">Управление аккаунтом и подпиской.</p>
        </div>

        <div className="space-y-6">
          {/* Subscription */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-ink mb-4">Подписка</h2>
            {currentPlan ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-surface rounded-2xl">
                  <div>
                    <p className="text-sm font-bold text-ink">{currentPlan.name} Plan</p>
                    <p className="text-xs text-ink-muted">{currentPlan.priceFormatted}/месяц · {currentPlan.aiMinutes.toLocaleString()} AI мин</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold">Активна</span>
                </div>
                <div className="flex gap-3">
                  <Link
                    href="/subscribe"
                    className="px-5 py-3 bg-surface-tinted text-ink font-bold rounded-2xl text-sm hover:bg-surface-border transition-all"
                  >
                    Сменить тариф
                  </Link>
                  <button
                    onClick={() => {
                      mockStore.subscription.cancel();
                      const { data } = mockStore.subscription.get();
                      setSubscription(data);
                    }}
                    className="px-5 py-3 text-coral font-bold rounded-2xl text-sm hover:bg-coral/5 transition-all"
                  >
                    Отменить
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-ink-secondary mb-4">Нет активной подписки</p>
                <Link
                  href="/subscribe"
                  className="inline-flex px-5 py-3 bg-brand text-white font-bold rounded-2xl shadow-[0_4px_0_0_#2E7D32] hover:brightness-110 active:shadow-none active:translate-y-1 transition-all text-sm"
                >
                  Выбрать тариф
                </Link>
              </div>
            )}
          </Card>

          {/* Profile Card */}
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center text-white font-black text-lg">
                {user?.name?.[0]?.toUpperCase() || 'T'}
              </div>
              <div>
                <p className="font-bold text-ink">{user?.name || 'Tutor'}</p>
                <p className="text-sm text-ink-secondary">{user?.email || ''}</p>
              </div>
            </div>
          </Card>

          {/* Sign Out */}
          <Card className="p-6 border-coral/20">
            <h2 className="text-lg font-bold text-ink mb-4">Выйти из аккаунта</h2>
            <p className="text-sm text-ink-secondary mb-4">Завершить сессию на этом устройстве.</p>
            <button
              onClick={() => {
                localStorage.removeItem('tutorai_mock');
                window.location.replace('/');
              }}
              className="px-5 py-3 bg-coral text-white font-bold rounded-2xl text-sm hover:bg-red-500 transition-all"
            >
              Выйти
            </button>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

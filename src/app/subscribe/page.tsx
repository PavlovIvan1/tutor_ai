'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { mockStore, plans, type Plan } from '@/lib/mock-store';
import type { Subscription } from '@/lib/mock-store';

function SubscribeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    const { data } = mockStore.subscription.get();
    setSubscription(data);
  }, []);

  // Handle return from YooKassa (mock or real)
  useEffect(() => {
    const paymentId = searchParams.get('payment_id');
    const status = searchParams.get('status');
    const planId = searchParams.get('plan') as 'starter' | 'pro' | 'power' | null;

    if (paymentId && status === 'succeeded' && planId) {
      mockStore.subscription.activate(planId, paymentId);
      const { data } = mockStore.subscription.get();
      setSubscription(data);
      router.replace('/subscribe');
    }
  }, [searchParams, router]);

  const handleCheckout = async (plan: Plan) => {
    setSelectedPlan(plan);
    setLoading(true);

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          return_url: `${window.location.origin}/subscribe`,
        }),
      });

      const data = await res.json();

      if (data.confirmation_url) {
        window.location.href = data.confirmation_url;
      }
    } catch {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    mockStore.subscription.cancel();
    const { data } = mockStore.subscription.get();
    setSubscription(data);
  };

  if (subscription?.plan) {
    const currentPlan = plans.find((p) => p.id === subscription.plan);
    const usagePercent = Math.round((subscription.ai_minutes_used / subscription.ai_minutes_total) * 100);

    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <Link href="/dashboard" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white font-black text-lg">T</div>
              <span className="font-black text-2xl text-ink">TutorAI</span>
            </Link>
          </div>

          <div className="bg-white rounded-3xl border border-surface-border shadow-card p-8">
            <div className="text-center mb-6">
              <span className="px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold uppercase tracking-wider">Активная подписка</span>
              <h1 className="text-2xl font-black text-ink mt-3">{currentPlan?.name}</h1>
              <p className="text-ink-secondary mt-1">{currentPlan?.priceFormatted}/месяц</p>
            </div>

            <div className="bg-surface rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-ink-secondary">AI Minutes</span>
                <span className="text-sm font-black text-ink">{subscription.ai_minutes_used.toLocaleString()} / {subscription.ai_minutes_total.toLocaleString()}</span>
              </div>
              <div className="w-full h-3 rounded-full bg-surface-border overflow-hidden">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${usagePercent}%` }} />
              </div>
              <p className="text-xs text-ink-muted mt-2 text-right">{subscription.ai_minutes_total - subscription.ai_minutes_used} мин осталось</p>
            </div>

            {subscription.expires_at && (
              <p className="text-xs text-ink-muted text-center mb-6">
                Продление: {new Date(subscription.expires_at).toLocaleDateString('ru-RU')}
              </p>
            )}

            <div className="space-y-3">
              <Link
                href="/dashboard"
                className="block text-center py-3 rounded-2xl bg-brand text-white font-bold text-sm shadow-[0_4px_0_0_#2E7D32] hover:brightness-110 active:shadow-none active:translate-y-1 transition-all"
              >
                Перейти в кабинет
              </Link>
              <button
                onClick={handleCancel}
                className="block w-full text-center py-3 rounded-2xl text-sm font-bold text-ink-muted hover:text-coral transition-colors"
              >
                Отменить подписку
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white font-black text-lg">T</div>
            <span className="font-black text-2xl text-ink">TutorAI</span>
          </Link>
          <h1 className="text-3xl font-black text-ink">Выберите тариф</h1>
          <p className="text-ink-secondary mt-2">Pay as you go. Платите за AI минуты.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-3xl p-8 border-2 transition-all ${
                plan.popular
                  ? 'border-brand bg-brand-light/20 shadow-card scale-105'
                  : 'border-surface-border bg-white hover:shadow-card'
              } ${selectedPlan?.id === plan.id ? 'opacity-60 pointer-events-none' : ''}`}
            >
              {plan.popular && (
                <div className="text-xs font-bold text-brand mb-3 uppercase tracking-wider">Most popular</div>
              )}
              <h2 className="text-xl font-black text-ink">{plan.name}</h2>
              <div className="mt-3 mb-1">
                <span className="text-4xl font-black text-ink">{plan.priceFormatted}</span>
                <span className="text-sm text-ink-muted">/мес</span>
              </div>
              <p className="text-sm font-bold text-brand mb-6">{plan.aiMinutes.toLocaleString()} AI мин</p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-ink-secondary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout(plan)}
                disabled={loading && selectedPlan?.id === plan.id}
                className={`w-full text-center py-3 rounded-2xl font-bold text-sm transition-all ${
                  plan.popular
                    ? 'bg-brand text-white shadow-[0_4px_0_0_#2E7D32] hover:brightness-110 active:shadow-none active:translate-y-1'
                    : 'bg-surface-tinted text-ink hover:bg-surface-border shadow-[0_3px_0_0_#D0D0D8] active:shadow-none active:translate-y-[2px]'
                } disabled:opacity-50`}
              >
                {loading && selectedPlan?.id === plan.id ? 'Перенаправление...' : 'Оплатить'}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-ink-muted mt-8">
          Оплата через ЮKassa. Безопасная оплата банковской картой.
        </p>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SubscribeContent />
    </Suspense>
  );
}

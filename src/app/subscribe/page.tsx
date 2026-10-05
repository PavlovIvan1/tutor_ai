'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { mockStore, plans, lessonLimit, lessonsLeft, planById, subscriptionDaysLeft, subscriptionPeriodLabel, formatRub, YEARLY_BADGE, FREE_LESSON_LIMIT, type Plan } from '@/lib/mock-store';
import type { Subscription } from '@/lib/mock-store';

type BillingPeriod = 'month' | 'year';

function SubscribeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [period, setPeriod] = useState<BillingPeriod>('month');

  // Ползущая подложка табов: измеряем кнопки и двигаем один абсолютный элемент через transform
  const tabsRef = useRef<HTMLDivElement>(null);
  const monthBtnRef = useRef<HTMLButtonElement>(null);
  const yearBtnRef = useRef<HTMLButtonElement>(null);
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(null);

  const updateIndicator = useCallback(() => {
    const container = tabsRef.current;
    const btn = period === 'year' ? yearBtnRef.current : monthBtnRef.current;
    if (!container || !btn) return;
    const c = container.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    setIndicator({ x: b.left - c.left, w: b.width });
  }, [period]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    const onResize = () => updateIndicator();
    window.addEventListener('resize', onResize);
    // После загрузки веб-шрифтов позиции кнопок могут сдвинуться
    if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
      (document as any).fonts.ready.then(() => updateIndicator()).catch(() => {});
    }
    return () => window.removeEventListener('resize', onResize);
  }, [updateIndicator]);

  useEffect(() => {
    const { data } = mockStore.subscription.get();
    setSubscription(data);
  }, []);

  // Handle return from YooKassa
  useEffect(() => {
    const paymentId = searchParams.get('payment_id');

    // Direct return with params (mock mode)
    const status = searchParams.get('status');
    const planId = searchParams.get('plan') as 'starter' | 'pro' | 'power' | null;
    const urlPeriod = searchParams.get('period') === 'year' ? 'year' : 'month';
    if (paymentId && status === 'succeeded' && planId) {
      mockStore.subscription.activate(planId, paymentId, urlPeriod);
      const { data } = mockStore.subscription.get();
      setSubscription(data);
      router.replace('/subscribe');
      return;
    }

    // Real YooKassa return — verify payment
    const stored = localStorage.getItem('tutorai_pending_payment');
    if (stored) {
      const pending = JSON.parse(stored);
      setVerifying(true);

      fetch(`/api/subscribe?payment_id=${pending.payment_id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.status === 'succeeded' || data.paid) {
            mockStore.subscription.activate(pending.plan, pending.payment_id, pending.period === 'year' ? 'year' : 'month');
            localStorage.removeItem('tutorai_pending_payment');
            const { data: sub } = mockStore.subscription.get();
            setSubscription(sub);
          } else {
            // Payment not yet confirmed, keep checking
            localStorage.removeItem('tutorai_pending_payment');
          }
          setVerifying(false);
          router.replace('/subscribe');
        })
        .catch(() => {
          setVerifying(false);
          router.replace('/subscribe');
        });
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
          period,
          return_url: `${window.location.origin}/subscribe`,
        }),
      });

      const data = await res.json();

      if (data.payment_id) {
        // Store pending payment before redirect
        localStorage.setItem('tutorai_pending_payment', JSON.stringify({
          payment_id: data.payment_id,
          plan: plan.id,
          period,
        }));
      }

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

  if (verifying) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-ink-secondary">Проверяем статус оплаты...</p>
        </div>
      </div>
    );
  }

  if (subscription?.plan && !showPlans) {
    const currentPlan = plans.find((p) => p.id === subscription.plan);
    const total = lessonLimit(subscription);
    const used = subscription.lessons_used || 0;
    const usagePercent = total > 0 ? Math.round((used / total) * 100) : 0;

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
              <p className="text-ink-secondary mt-1">
                {subscription.period === 'year' ? currentPlan?.yearlyPriceFormatted : currentPlan?.priceFormatted}
                /{subscription.period === 'year' ? 'год' : 'месяц'}
                <span className="text-ink-muted"> · подписка: {subscriptionPeriodLabel(subscription)}</span>
              </p>
            </div>

            <div className="bg-surface rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-ink-secondary">Уроки</span>
                <span className="text-sm font-black text-ink">{used} / {total}</span>
              </div>
              <div className="w-full h-3 rounded-full bg-surface-border overflow-hidden">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${usagePercent}%` }} />
              </div>
              <p className="text-xs text-ink-muted mt-2 text-right">{Math.max(0, total - used)} уроков осталось</p>
            </div>

            {subscription.expires_at && (
              <p className="text-xs text-ink-muted text-center mb-6">
                Активна до {new Date(subscription.expires_at).toLocaleDateString('ru-RU')} · {subscriptionDaysLeft(subscription)} дн.
                <span className="block mt-1">После окончания подписка вернётся на бесплатный тариф</span>
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
                onClick={() => setShowPlans(true)}
                className="block w-full text-center py-3 rounded-2xl font-bold text-sm bg-surface-tinted text-ink hover:bg-surface-border shadow-[0_3px_0_0_#D0D0D8] active:shadow-none active:translate-y-[2px] transition-all"
              >
                Продлить / сменить тариф
              </button>
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
          <p className="text-ink-secondary mt-2">Помесячная подписка: все функции и лимит уроков каждый месяц.</p>
        </div>

          {showPlans && (
            <div className="mb-4 flex justify-end">
              <button onClick={() => setShowPlans(false)} className="text-sm font-bold text-ink-muted hover:text-brand transition-colors">
                ← К текущему тарифу
              </button>
            </div>
          )}
          {/* Табы: помесячные / годовые */}
          <div className="flex justify-center mb-6">
            <div
              ref={tabsRef}
              role="tablist"
              aria-label="Период подписки"
              className="relative inline-flex p-1.5 rounded-2xl bg-surface-tinted gap-1"
            >
              {indicator && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1.5 bottom-1.5 rounded-xl pointer-events-none transition-[transform,width,background-color,box-shadow] duration-300 ease-out will-change-transform"
                  style={{
                    transform: `translate3d(${indicator.x}px, 0, 0)`,
                    width: `${indicator.w}px`,
                    backgroundColor: period === 'year' ? 'var(--brand)' : '#FFFFFF',
                    boxShadow: period === 'year' ? '0 3px 0 0 #2E7D32' : '0 2px 6px rgba(17, 24, 39, 0.08)',
                  }}
                />
              )}
              <button
                ref={monthBtnRef}
                type="button"
                role="tab"
                aria-selected={period === 'month'}
                onClick={() => setPeriod('month')}
                className={`relative z-10 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors duration-300 ${
                  period === 'month' ? 'text-ink' : 'text-ink-secondary hover:text-ink'
                }`}
              >
                Помесячные
              </button>
              <button
                ref={yearBtnRef}
                type="button"
                role="tab"
                aria-selected={period === 'year'}
                onClick={() => setPeriod('year')}
                className={`relative z-10 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors duration-300 ${
                  period === 'year' ? 'text-white' : 'text-ink-secondary hover:text-ink'
                }`}
              >
                Годовые
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-black transition-colors duration-300 ${
                  period === 'year' ? 'bg-white/20 text-white' : 'bg-brand/10 text-brand'
                }`}>
                  {YEARLY_BADGE}
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {!subscription?.plan && period === 'month' && (
            <div className="rounded-3xl p-8 border-2 border-surface-border bg-white hover:shadow-card transition-all">
              <div className="text-xs font-bold text-ink-muted mb-3 uppercase tracking-wider">Бесплатно</div>
              <h2 className="text-xl font-black text-ink">Free</h2>
              <div className="mt-3 mb-1">
                <span className="text-4xl font-black text-ink">0 ₽</span>
                <span className="text-sm text-ink-muted"> / навсегда</span>
              </div>
              <p className="text-sm font-bold text-brand mb-6">{FREE_LESSON_LIMIT} урок</p>
              <ul className="space-y-3 mb-8">
                {['Все функции сервиса', 'Ученики и прогресс', 'AI-анализ урока', 'Домашние задания', `${FREE_LESSON_LIMIT} урок навсегда`].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-ink-secondary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={subscription ? '/subscribe' : '/dashboard'}
                className="block w-full text-center py-3 rounded-2xl font-bold text-sm bg-surface-tinted text-ink hover:bg-surface-border shadow-[0_3px_0_0_#D0D0D8] active:shadow-none active:translate-y-[2px] transition-all"
              >
                Текущий тариф
              </Link>
            </div>
          )}

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
                <span className="text-4xl font-black text-ink">
                  {period === 'year' ? plan.yearlyPriceFormatted : plan.priceFormatted}
                </span>
                <span className="text-sm text-ink-muted"> {period === 'year' ? 'в год' : 'в месяц'}</span>
              </div>
              {period === 'year' ? (
                <p className="text-xs text-ink-muted mb-1">
                  <span className="line-through">{formatRub(plan.price * 12)}</span> · скидка 35% · ≈ {formatRub(plan.yearlyPrice / 12)} в месяц
                </p>
              ) : (
                <p className="text-xs text-ink-muted mb-1">при оплате за месяц</p>
              )}
              <p className="text-sm font-bold text-brand mb-6">{plan.lessons} уроков в месяц</p>
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
                {loading && selectedPlan?.id === plan.id
                  ? 'Перенаправление...'
                  : subscription?.plan === plan.id && (subscription.period || 'month') === period
                    ? `Продлить на ${period === 'year' ? 'год' : 'месяц'}`
                    : 'Оплатить'}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-ink-muted mt-8">
          Оплата через ЮKassa. Подписка оформляется на месяц или год (−30%) и продлевается по окончании периода.
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

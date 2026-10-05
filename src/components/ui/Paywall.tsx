'use client';

import Link from 'next/link';

interface PaywallProps {
  title?: string;
  description?: string;
  cta?: string;
}

export default function Paywall({ title, description, cta }: PaywallProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16">
      <div className="w-20 h-20 rounded-2xl bg-brand-light flex items-center justify-center mb-6">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <h2 className="text-xl font-black text-ink mb-2">{title || 'Подключите подписку'}</h2>
      <p className="text-sm text-ink-secondary max-w-md mb-8">
        {description || 'Этот раздел доступен только для пользователей с активной подпиской. Выберите тариф чтобы продолжить.'}
      </p>
      <Link
        href="/subscribe"
        className="px-8 py-4 bg-brand text-white font-bold rounded-2xl shadow-[0_4px_0_0_#2E7D32] hover:brightness-110 active:shadow-none active:translate-y-1 transition-all text-base"
      >
        {cta || 'Выбрать тариф'}
      </Link>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { mockStore } from '@/lib/mock-store';
import { consentStore } from '@/lib/consent-store';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { FaYandexInternational } from 'react-icons/fa';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreement, setAgreement] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreement) {
      setError('Необходимо принять пользовательское соглашение');
      return;
    }

    setLoading(true);

    const { data, error: authError } = await mockStore.auth.signUp(email, password, fullName);

    if (authError) {
      setError(authError);
      setLoading(false);
      return;
    }

    if (data?.user) {
      await consentStore.save({
        user_id: data.user.id,
        consent_type: 'agreement',
        granted: true,
      });
      await consentStore.save({
        user_id: data.user.id,
        consent_type: 'newsletter',
        granted: newsletter,
      });
    }

    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white font-black text-lg">
              T
            </div>
            <span className="font-black text-2xl text-ink">TutorAI</span>
          </Link>
          <h1 className="text-2xl font-black text-ink">Создайте аккаунт</h1>
          <p className="text-ink-secondary mt-2">Начните преподавать умнее уже сегодня</p>
        </div>

        <div className="bg-white rounded-3xl border border-surface-border shadow-card p-8">
          <form onSubmit={handleSignup} className="space-y-5">
            <Input
              label="Имя"
              type="text"
              placeholder="Павлов Иван"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Пароль"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreement}
                  onChange={(e) => setAgreement(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-surface-border text-brand focus:ring-brand accent-[#4CAF50]"
                />
                <span className="text-xs text-ink-secondary leading-tight">
                  Я принимаю{' '}
                  <Link href="/offer" className="font-bold text-brand hover:underline" target="_blank">пользовательское соглашение</Link>{' '}
                  и{' '}
                  <Link href="/privacy" className="font-bold text-brand hover:underline" target="_blank">политику конфиденциальности</Link>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newsletter}
                  onChange={(e) => setNewsletter(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-surface-border text-brand focus:ring-brand accent-[#4CAF50]"
                />
                <span className="text-xs text-ink-secondary leading-tight">
                  Хочу получать полезные советы по преподаванию и новости TutorAI
                </span>
              </label>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-coral text-sm font-semibold">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full">
              Создать аккаунт
            </Button>
          </form>

          <div className="mt-5">
            <button
              onClick={() => { window.location.href = '/api/auth/yandex/callback'; }}
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3 bg-[#FC3F1D] text-white font-bold rounded-2xl shadow-[0_4px_0_0_#C13515] hover:brightness-110 active:shadow-none active:translate-y-[2px] transition-all text-sm"
            >
              <FaYandexInternational size={18} />
              Войти с Яндексом
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-ink-secondary">
              Уже есть аккаунт?{' '}
              <Link href="/auth/login" className="font-bold text-brand hover:text-brand-dark">
                Войти
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

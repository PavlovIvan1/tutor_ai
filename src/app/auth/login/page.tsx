'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { mockStore } from '@/lib/mock-store';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { FaYandexInternational } from 'react-icons/fa';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await mockStore.auth.signIn(email, password);

    if (authError) {
      setError(authError);
      setLoading(false);
      return;
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
          <h1 className="text-2xl font-black text-ink">Добро пожаловать</h1>
          <p className="text-ink-secondary mt-2">Войдите в свой кабинет</p>
        </div>

        <div className="bg-white rounded-3xl border border-surface-border shadow-card p-8">
          <form onSubmit={handleLogin} className="space-y-5">
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
            />

            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-coral text-sm font-semibold">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full">
              Войти
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
              Нет аккаунта?{' '}
              <Link href="/auth/signup" className="font-bold text-brand hover:text-brand-dark">
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

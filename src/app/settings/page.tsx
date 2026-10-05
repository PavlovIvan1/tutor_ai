'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { MATERIAL_CATEGORIES } from '@/lib/prompts';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { mockStore, plans, lessonsLeft, subscriptionDaysLeft, subscriptionPeriodLabel } from '@/lib/mock-store';
import type { Subscription } from '@/lib/mock-store';

export default function SettingsPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  const [materials, setMaterials] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [materialCategory, setMaterialCategory] = useState('general');
  const [uploading, setUploading] = useState(false);
  const [materialMsg, setMaterialMsg] = useState('');
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  const loadMaterials = async () => {
    try {
      const res = await fetch('/api/materials');
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.materials || []);
      }
    } catch {}
    setLoadingMaterials(false);
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const uploadMaterials = async () => {
    if (!files.length) return;
    setUploading(true);
    setMaterialMsg('');
    let failed = 0;
    for (const f of files) {
      try {
        let body: any = { filename: f.name, category: materialCategory };
        if (f.name.toLowerCase().endsWith('.pdf')) {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
            reader.onerror = () => reject(new Error('read error'));
            reader.readAsDataURL(f);
          });
          body.fileBase64 = base64;
          body.mime = f.type;
        } else {
          body.text = await f.text();
        }
        const res = await fetch('/api/materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          failed++;
          setMaterialMsg(`Ошибка в «${f.name}»: ${err.error || res.status}`);
        }
      } catch {
        failed++;
      }
    }
    setFiles([]);
    const input = document.getElementById('material-file-input') as HTMLInputElement | null;
    if (input) input.value = '';
    if (!failed) setMaterialMsg(`Загружено: ${files.length}`);
    setUploading(false);
    loadMaterials();
  };

  const deleteMaterial = async (id: string) => {
    await fetch(`/api/materials/${id}`, { method: 'DELETE' });
    setMaterials((m) => m.filter((x) => x.id !== id));
  };

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
                    <p className="text-xs text-ink-muted">
                      {subscription?.period === 'year'
                        ? `${currentPlan.yearlyPriceFormatted} в год · ${currentPlan.lessons} уроков в месяц`
                        : `${currentPlan.priceFormatted} в месяц · ${currentPlan.lessons} уроков в месяц`}
                      {' · '}период: {subscriptionPeriodLabel(subscription)}
                    </p>
                    {subscription?.expires_at && (
                      <p className="text-xs text-ink-muted mt-0.5">
                        Активна до {new Date(subscription.expires_at).toLocaleDateString('ru-RU')} · {subscriptionDaysLeft(subscription)} дн.
                      </p>
                    )}
                  </div>
                  <span className="px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold">Активна</span>
                </div>
                <div className="flex gap-3">
                  <Link
                    href="/subscribe"
                    className="px-5 py-3 bg-surface-tinted text-ink font-bold rounded-2xl text-sm hover:bg-surface-border transition-all"
                  >
                    Продлить / сменить тариф
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
                <p className="text-sm font-bold text-ink mb-1">Бесплатный тариф · 1 урок навсегда</p>
                <p className="text-xs text-ink-muted mb-4">
                  {lessonsLeft(subscription)} урок(ов) осталось · Все функции доступны
                </p>
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

          {/* Materials for AI */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-ink mb-1">Материалы для нейросети</h2>
            <p className="text-sm text-ink-secondary mb-4">
              Загрузите пробники и конспекты (ОГЭ, ЕГЭ, IELTS, TOEFL…). Нейросеть будет опираться на них при анализе
              уроков и генерации домашних заданий — особенно у учеников с целью «подготовка к экзамену».
            </p>

            <div className="flex flex-wrap items-end gap-3 mb-3">
              <div className="min-w-[170px]">
                <label className="block text-sm font-bold text-ink-secondary mb-1.5">Категория</label>
                <select
                  value={materialCategory}
                  onChange={(e) => setMaterialCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-surface-border bg-white text-ink font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                  {MATERIAL_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[220px]">
                <label className="block text-sm font-bold text-ink-secondary mb-1.5">Файлы</label>
                <input
                  id="material-file-input"
                  type="file"
                  multiple
                  accept=".pdf,.txt,.md,.csv,.json"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  className="w-full text-sm text-ink-secondary file:mr-3 file:px-4 file:py-2.5 file:rounded-xl file:border-0 file:bg-brand/10 file:text-brand file:text-sm file:font-bold hover:file:bg-brand/20"
                />
              </div>
              <Button onClick={uploadMaterials} loading={uploading} disabled={!files.length} size="sm">
                Загрузить
              </Button>
            </div>

            {materialMsg && <p className="text-xs font-bold text-brand mb-2">{materialMsg}</p>}
            <p className="text-xs text-ink-muted mb-3">Поддерживаются PDF, TXT, MD, CSV, JSON</p>

            {loadingMaterials ? (
              <p className="text-sm text-ink-muted">Загрузка списка...</p>
            ) : materials.length === 0 ? (
              <p className="text-sm text-ink-secondary">Материалов пока нет</p>
            ) : (
              <ul className="space-y-2">
                {materials.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-surface-tinted border border-surface-border"
                  >
                    <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand text-xs font-black flex items-center justify-center flex-shrink-0">
                      {(m.category || 'gen').slice(0, 3).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink truncate">{m.filename}</p>
                      <p className="text-xs text-ink-muted">
                        {MATERIAL_CATEGORIES.find((c) => c.value === m.category)?.label || m.category} ·{' '}
                        {Math.max(1, Math.round((m.size || 0) / 1000))} КБ ·{' '}
                        {new Date(m.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteMaterial(m.id)}
                      className="text-xs font-bold text-ink-muted hover:text-coral transition-colors"
                    >
                      Удалить
                    </button>
                  </li>
                ))}
              </ul>
            )}
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

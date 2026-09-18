'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { mockStore } from '@/lib/mock-store';
import { getAvatarUrl } from '@/lib/utils';

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const { data } = mockStore.auth.getUser();
    setIsLoggedIn(!!data.user);

    const colors: Record<string, Record<string, string>> = {
      green: {
        '--brand': '#4CAF50',
        '--brand-dark': '#43A047',
        '--brand-light': '#E8F5E9',
        '--brand-shadow': '#2E7D32',
        '--green-shadow': '0 4px 0 0 #2E7D32',
      },
      gold: {
        '--brand': '#BDA442',
        '--brand-dark': '#A89038',
        '--brand-light': '#F5F0D0',
        '--brand-shadow': '#8B7A2E',
        '--green-shadow': '0 4px 0 0 #8B7A2E',
      },
      burgundy: {
        '--brand': '#910029',
        '--brand-dark': '#7A0022',
        '--brand-light': '#F5DDE6',
        '--brand-shadow': '#5C001A',
        '--green-shadow': '0 4px 0 0 #5C001A',
      },
    };

    document.querySelectorAll('[data-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const color = (btn as HTMLElement).dataset.color;
        if (!color || !colors[color]) return;
        const root = document.documentElement;
        Object.entries(colors[color]).forEach(([k, v]) => root.style.setProperty(k, v));
        document.querySelectorAll('[data-color]').forEach((b) => b.classList.remove('ring-2', 'ring-brand'));
        btn.classList.add('ring-2', 'ring-brand');
      });
    });
  }, []);

  return (
    <div className="min-h-screen bg-surface">
      {/* Navbar */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-5xl bg-white/80 backdrop-blur-xl border border-surface-border rounded-2xl px-6 py-3 flex items-center justify-between z-50 shadow-card">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          </div>
          <span className="font-black text-lg text-ink">TutorAI</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm font-bold text-ink-secondary">
          <a href="#how" className="hover:text-ink transition-colors">Как работает</a>
          <a href="#why" className="hover:text-ink transition-colors">Почему мы</a>
          <a href="#before-after" className="hover:text-ink transition-colors">До и после</a>
          <a href="#pricing" className="hover:text-ink transition-colors">Тарифы</a>
        </div>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" className="text-sm font-bold text-ink-secondary hover:text-ink transition-colors">Главная</Link>
              <Link
                href="/dashboard"
                className="px-5 py-2.5 bg-brand text-white font-bold rounded-2xl shadow-[0_3px_0_0_#2E7D32] hover:brightness-110 active:shadow-none active:translate-y-1 transition-all text-sm"
              >
                Войти в кабинет
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="text-sm font-bold text-ink-secondary hover:text-ink transition-colors">Войти</Link>
              <Link
                href="/auth/signup"
                className="px-5 py-2.5 bg-brand text-white font-bold rounded-2xl shadow-[0_3px_0_0_#2E7D32] hover:brightness-110 active:shadow-none active:translate-y-1 transition-all text-sm"
              >
                Начать бесплатно
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-0 px-4 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-light text-brand-dark text-sm font-bold mb-6">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            AI-анализ каждого урока
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-ink leading-tight mb-6">
            AI запоминает каждый урок<br />для каждого ученика.
          </h1>
          <p className="text-xl text-ink-secondary max-w-2xl mx-auto mb-8">
            Проведите урок. Мы берём на себя всё остальное.
          </p>
          <div className="flex items-center justify-center gap-4 mb-6">
            <Link
              href={isLoggedIn ? '/dashboard' : '/auth/signup'}
              className="px-8 py-4 bg-brand text-white font-bold rounded-2xl shadow-[0_4px_0_0_#2E7D32] hover:brightness-110 active:shadow-none active:translate-y-1 transition-all text-base"
            >
              {isLoggedIn ? 'Войти в кабинет' : 'Начать бесплатно'}
            </Link>
            <a
              href="#how"
              className="px-8 py-4 bg-white text-ink font-bold rounded-2xl shadow-[0_3px_0_0_#E8E8ED] border-2 border-surface-border hover:border-brand hover:text-brand active:shadow-none active:translate-y-[2px] transition-all text-base"
            >
              Как это работает
            </a>
          </div>
          {/* Trust row */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {['Анна М.', 'Дмитрий К.', 'Елена В.', 'Сергей П.'].map((name) => (
                <img
                  key={name}
                  src={getAvatarUrl(name)}
                  alt=""
                  className="w-8 h-8 rounded-full border-2 border-white object-cover bg-surface-tinted"
                />
              ))}
            </div>
            <p className="text-sm text-ink-muted font-bold">10+ репетиторов уже используют нас</p>
          </div>
        </div>

        {/* Browser mockup overlapping hero */}
        <div className="max-w-5xl mx-auto mt-12 relative" style={{ marginBottom: '-40px' }}>
          <div className="rounded-2xl border-[8px] border-[#C8E6C9] bg-white overflow-hidden">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-surface-tinted border-b border-surface-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-coral" />
                <div className="w-3 h-3 rounded-full bg-honey" />
                <div className="w-3 h-3 rounded-full bg-brand" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white rounded-lg px-3 py-1 text-xs text-ink-muted border border-surface-border text-center">
                  tutorai.app/dashboard
                </div>
              </div>
            </div>
        {/* Dashboard mockup */}
            <div className="flex min-h-[420px]">
              {/* Sidebar */}
              <div className="w-48 border-r border-surface-border p-3 flex-shrink-0 hidden md:flex flex-col">
                <div className="flex items-center gap-2 px-2 py-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-brand flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  </div>
                  <span className="font-black text-xs text-ink">TutorAI</span>
                </div>
                {[
                  { label: 'Dashboard', active: true },
                  { label: 'Students', active: false },
                  { label: 'Lessons', active: false },
                  { label: 'Homework', active: false },
                  { label: 'Settings', active: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold ${
                      item.active ? 'bg-brand-light text-brand-dark' : 'text-ink-muted'
                    }`}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
              {/* Content */}
              <div className="flex-1 p-5">
                <div className="mb-4">
                  <p className="text-sm font-black text-ink">Dashboard</p>
                  <p className="text-[10px] text-ink-muted">Welcome back. Here&apos;s your teaching overview.</p>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { label: 'Students', value: '4', sub: 'View all', color: 'text-ink' },
                    { label: 'Lessons', value: '8', sub: 'This week', color: 'text-ink' },
                    { label: 'Homework', value: '94%', sub: 'Completed', color: 'text-ink' },
                    { label: 'Attention', value: '1', sub: 'Needs review', color: 'text-ink' },
                  ].map((m) => (
                    <div key={m.label} className="bg-white rounded-xl border border-surface-border p-2.5">
                      <p className="text-[9px] font-bold text-ink-muted uppercase tracking-wider">{m.label}</p>
                      <p className={`text-lg font-black ${m.color} mt-0.5`}>{m.value}</p>
                      <p className="text-[9px] text-ink-muted">{m.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-white rounded-xl border border-surface-border p-3">
                    <p className="text-[10px] font-bold text-ink mb-1.5">Quick Start</p>
                    <p className="text-[9px] text-ink-muted mb-2">Begin a lesson recording</p>
                    <div className="bg-brand text-white text-[9px] font-bold rounded-lg px-3 py-1.5 inline-flex items-center gap-1">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/></svg>
                      Start Lesson
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-surface-border p-3">
                    <p className="text-[10px] font-bold text-ink mb-1.5">Recent Lessons</p>
                    <div className="space-y-1.5">
                      {[
                        { name: 'Мария К.', date: '2 дня назад', dur: '45 мин' },
                        { name: 'Даниил П.', date: '3 дня назад', dur: '60 мин' },
                      ].map((l) => (
                        <div key={l.name} className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full bg-brand-light flex items-center justify-center">
                            <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-bold text-ink truncate">{l.name}</p>
                          </div>
                          <p className="text-[8px] text-ink-muted">{l.dur}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-surface-border p-3">
                  <p className="text-[10px] font-bold text-ink mb-2">Students Needing Attention</p>
                  <div className="flex items-center gap-2">
                    <img src={getAvatarUrl('Тимур Ш.')} alt="" className="w-5 h-5 rounded-full bg-surface-tinted" />
                    <div className="flex-1">
                      <p className="text-[9px] font-bold text-ink">Тимур Ш.</p>
                      <p className="text-[8px] text-ink-muted">Progress below 50%</p>
                    </div>
                    <div className="text-[8px] text-coral font-bold px-1.5 py-0.5 bg-red-50 rounded-full">45%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-ink mb-4">Как это работает</h2>
            <p className="text-lg text-ink-secondary">От урока до персонального ДЗ за 4 шага.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Начните урок',
                desc: 'Выберите ученика и начните запись.',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>,
              },
              {
                step: '02',
                title: 'Преподавайте',
                desc: 'Учите как обычно. Без лишней работы.',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
              },
              {
                step: '03',
                title: 'AI-анализ',
                desc: 'ИИ анализирует расшифровку автоматически.',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 0-4 4c0 2 2 4 4 4s4-2 4-4a4 4 0 0 0-4-4Z"/><path d="M16 14h.01"/><path d="M8 14h.01"/><path d="M6 18h12"/><path d="M9 14c0 3 1.5 5 3 5s3-2 3-5"/></svg>,
              },
              {
                step: '04',
                title: 'Отправьте ДЗ',
                desc: 'Просмотрите и отправьте персональное задание.',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
              },
            ].map((item) => (
              <div key={item.step} className="text-center relative">
                {item.step !== '01' && (
                  <div className="hidden md:block absolute top-8 -left-4 w-8 text-surface-border">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>
                )}
                <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-light text-brand flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <p className="text-xs font-bold text-brand mb-2">Шаг {item.step}</p>
                <h3 className="text-lg font-bold text-ink mb-2">{item.title}</h3>
                <p className="text-sm text-ink-secondary">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Student Intelligence */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-ink mb-4">Знайте своих учеников</h2>
            <p className="text-lg text-ink-secondary">AI строит долгосрочное понимание каждого ученика.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-surface rounded-3xl p-8 border border-surface-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-brand-light flex items-center justify-center text-brand">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 0-4 4c0 2 2 4 4 4s4-2 4-4a4 4 0 0 0-4-4Z"/><path d="M16 14h.01"/><path d="M8 14h.01"/><path d="M6 18h12"/></svg>
                </div>
                <h3 className="text-lg font-bold text-ink">AI-память ученика</h3>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white border border-surface-border">
                  <p className="text-xs font-bold text-brand mb-1">Сильные стороны</p>
                  <p className="text-sm text-ink-secondary">Хорошо усваивает грамматику, активная лексика растёт</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-surface-border">
                  <p className="text-xs font-bold text-coral mb-1">Над чем работать</p>
                  <p className="text-sm text-ink-secondary">Сложности с артиклями, necesita практику условных предложений</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-surface-border">
                  <p className="text-xs font-bold text-honey mb-1">Паттерны</p>
                  <p className="text-sm text-ink-secondary">Путает present perfect и past simple в повседневных ситуациях</p>
                </div>
              </div>
            </div>
            <div className="bg-surface rounded-3xl p-8 border border-surface-border">
              <h3 className="text-lg font-bold text-ink mb-6">Прогресс по темам</h3>
              <div className="space-y-4">
                {[
                  { topic: 'Грамматика', progress: 78, color: 'bg-brand' },
                  { topic: 'Лексика', progress: 65, color: 'bg-sky' },
                  { topic: 'Аудирование', progress: 52, color: 'bg-honey' },
                  { topic: 'Говорение', progress: 41, color: 'bg-coral' },
                  { topic: 'Чтение', progress: 88, color: 'bg-lavender' },
                  { topic: 'Письмо', progress: 59, color: 'bg-brand' },
                ].map((t) => (
                  <div key={t.topic}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-bold text-ink">{t.topic}</span>
                      <span className="text-sm font-bold text-ink-muted">{t.progress}%</span>
                    </div>
                    <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-surface-border">
                      <div className={`h-full rounded-full ${t.color} transition-all`} style={{ width: `${t.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Homework Generation */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-ink mb-4">Домашние задания на автопилоте</h2>
            <p className="text-lg text-ink-secondary">Персональные упражнения на основе реальных слабостей ученика.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'На основе урока',
                desc: 'AI анализирует расшифровку урока и создаёт упражнения на темы, которые вызвали трудности.',
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
              },
              {
                title: 'Персонализация',
                desc: 'Каждое задание учитывает уровень, слабости и прогресс конкретного ученика.',
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
              },
              {
                title: 'Сразу к ученику',
                desc: 'Отправьте задание одним кликом. Ученик получает ссылку и выполняет онлайн.',
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
              },
            ].map((f) => (
              <div key={f.title} className="bg-white p-6 rounded-3xl border border-surface-border shadow-soft hover:shadow-card transition-all">
                <div className="w-12 h-12 rounded-xl bg-brand-light text-brand flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-ink mb-2">{f.title}</h3>
                <p className="text-sm text-ink-secondary">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Tutors */}
      <section id="why" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-ink mb-4">Почему репетиторы выбирают нас</h2>
            <p className="text-lg text-ink-secondary">Мы знаем ваши проблемы и решаем их.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                problem: 'Тратите 30+ минут после урока на подготовку ДЗ',
                solution: 'AI создаёт персональное ДЗ за 2 минуты',
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
              },
              {
                problem: 'Забываете детали про каждого ученика между уроками',
                solution: 'AI-память хранит всё: сильные стороны, слабости, паттерны',
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 0-4 4c0 2 2 4 4 4s4-2 4-4a4 4 0 0 0-4-4Z"/><path d="M16 14h.01"/><path d="M8 14h.01"/><path d="M6 18h12"/></svg>,
              },
              {
                problem: 'Ученики теряют мотивацию без обратной связи',
                solution: 'Детальный разбор после каждого урока мотивирует учиться',
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
              },
              {
                problem: 'Сложно отслеживать прогресс каждого ученика',
                solution: 'Наглядные графики и отчёты по каждому ученику',
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>,
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-2xl bg-surface border border-surface-border">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-coral font-bold text-sm mb-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                    {item.problem}
                  </div>
                  <div className="flex items-center gap-2 text-brand font-bold text-sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {item.solution}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before / After */}
      <section id="before-after" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-ink mb-4">До и после</h2>
            <p className="text-lg text-ink-secondary">Как меняется работа репетитора.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-3xl border-2 border-coral/20 bg-white p-8">
              <div className="flex items-center gap-2 mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                <h3 className="text-xl font-black text-coral">Без TutorAI</h3>
              </div>
              <ul className="space-y-4">
                {[
                  '30+ минут на подготовку ДЗ после каждого урока',
                  'Забываете детали про учеников',
                  'Нет системы для отслеживания прогресса',
                  'Ученики теряют мотивацию',
                  'Ручная работа с каждым учеником',
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-ink-secondary">
                    <svg className="mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border-2 border-brand/20 bg-white p-8">
              <div className="flex items-center gap-2 mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <h3 className="text-xl font-black text-brand">С TutorAI</h3>
              </div>
              <ul className="space-y-4">
                {[
                  'ДЗ готово через 2 минуты после урока',
                  'AI-память помнит всё за вас',
                  'Наглядные графики прогресса',
                  'Персонализированные задания',
                  'Автоматизация рутины',
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-ink-secondary">
                    <svg className="mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-ink mb-4">Тарифы</h2>
            <p className="text-lg text-ink-secondary">Pay as you go. Платите за обработанные AI минуты.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                name: 'Starter',
                price: '490 ₽',
                minutes: '500',
                features: ['500 AI минут/мес', 'Безлимит учеников', 'Базовый AI-анализ', 'Домашние задания'],
                cta: 'Начать',
                highlighted: false,
              },
              {
                name: 'Pro',
                price: '990 ₽',
                minutes: '1 500',
                features: ['1 500 AI минут/мес', 'Безлимит учеников', 'AI-память учеников', 'Персональные ДЗ', 'Приоритетная поддержка'],
                cta: 'Попробовать',
                highlighted: true,
              },
              {
                name: 'Power',
                price: '1 990 ₽',
                minutes: '4 000',
                features: ['4 000 AI минут/мес', 'Безлимит учеников', 'AI-память учеников', 'Персональные ДЗ', 'Приоритетная поддержка', 'API доступ'],
                cta: 'Выбрать',
                highlighted: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-3xl p-8 border-2 transition-all ${
                  plan.highlighted
                    ? 'border-brand bg-brand-light/20 shadow-card scale-105'
                    : 'border-surface-border bg-white hover:shadow-card'
                }`}
              >
                {plan.highlighted && (
                  <div className="text-xs font-bold text-brand mb-3 uppercase tracking-wider">Most popular</div>
                )}
                <h3 className="text-xl font-black text-ink">{plan.name}</h3>
                <div className="mt-3 mb-1">
                  <span className="text-4xl font-black text-ink">{plan.price}</span>
                  <span className="text-sm text-ink-muted ml-1">/месяц</span>
                </div>
                <p className="text-sm font-bold text-brand mb-6">{plan.minutes} AI мин</p>
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
                <Link
                  href="/subscribe"
                  className={`block text-center py-3 rounded-2xl font-bold text-sm transition-all ${
                    plan.highlighted
                      ? 'bg-brand text-white shadow-[0_4px_0_0_#2E7D32] hover:brightness-110 active:shadow-none active:translate-y-1'
                      : 'bg-surface-tinted text-ink hover:bg-surface-border shadow-[0_3px_0_0_#D0D0D8] active:shadow-none active:translate-y-[2px]'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* Add-on packs */}
          <div className="mt-10 max-w-4xl mx-auto">
            <p className="text-center text-sm font-bold text-ink-muted mb-4">Докупайте минуты отдельно</p>
            <div className="flex items-center justify-center gap-4">
              {[
                { add: '+500', price: '290 ₽' },
                { add: '+1 000', price: '490 ₽' },
                { add: '+2 500', price: '990 ₽' },
              ].map((pack) => (
                <button
                  key={pack.add}
                  className="px-5 py-3 rounded-2xl border-2 border-surface-border bg-white text-sm font-bold text-ink hover:border-brand hover:text-brand shadow-[0_3px_0_0_#D0D0D8] active:shadow-none active:translate-y-[2px] transition-all"
                >
                  {pack.add} мин — {pack.price}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-0 px-0 bg-[#2C2C34]">
        <div className="max-w-3xl mx-auto text-center px-8 py-20">
          <h2 className="text-4xl font-black text-white mb-4 leading-tight">Проведите урок.<br />Мы сделаем остальное.</h2>
          <p className="text-lg text-white/50 mb-8">Начните бесплатно. Без кредитной карты. Аудио шифруется и хранится только на вашем устройстве.</p>
          <div className="flex items-center justify-center gap-4 mb-8">
            <Link
              href={isLoggedIn ? '/dashboard' : '/auth/signup'}
              className="px-8 py-4 bg-brand text-white font-bold rounded-2xl shadow-[0_4px_0_0_#2E7D32] hover:brightness-110 active:shadow-none active:translate-y-1 transition-all text-base"
            >
              {isLoggedIn ? 'Войти в кабинет' : 'Начать бесплатно'}
            </Link>
            <a href="#how" className="px-8 py-4 bg-white/10 text-white font-bold rounded-2xl shadow-[0_3px_0_0_rgba(255,255,255,0.1)] border border-white/20 hover:bg-white/20 active:shadow-none active:translate-y-[2px] transition-all text-base">
              Как это работает
            </a>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-white/40">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              Шифрование
            </div>
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              Без сервера
            </div>
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              2 мин на ДЗ
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10 bg-[#2C2C34]">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between text-sm text-white/40">
            <span>© 2026 TutorAI. Все права защищены.</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">Конфиденциальность</a>
              <a href="#" className="hover:text-white transition-colors">Условия</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

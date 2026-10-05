'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import SkillBars from '@/components/ui/SkillBars';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import { getAvatarUrl, getLevelColor, formatDurationLong } from '@/lib/utils';

const levelOptions = [
  { value: 'A1', label: 'A1 - Beginner' },
  { value: 'A2', label: 'A2 - Elementary' },
  { value: 'B1', label: 'B1 - Intermediate' },
  { value: 'B2', label: 'B2 - Upper Intermediate' },
  { value: 'C1', label: 'C1 - Advanced' },
  { value: 'C2', label: 'C2 - Proficient' },
];

export default function StudentProfilePage() {
  const params = useParams();
  const [student, setStudent] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<any>({});

  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/students/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setStudent(data.student);
        setLessons(data.lessons || []);
        setNotes(data.student?.notes || '');
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [params.id]);

  const setField = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  const openEdit = () => {
    setForm({
      name: student.name || '',
      email: student.email || '',
      level: student.level || 'A1',
      goals: student.goals || '',
      notes: student.notes || '',
    });
    setError('');
    setEditing(true);
  };

  const patchStudent = async (body: Record<string, any>) => {
    const res = await fetch(`/api/students/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Не удалось сохранить');
    }
    const data = await res.json();
    setStudent(data.student);
    return data.student;
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await patchStudent(form);
      setEditing(false);
      setNotice('Данные ученика сохранены');
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения');
    }
    setSaving(false);
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    setError('');
    setNotice('');
    try {
      await patchStudent({ notes });
      setNotice('Заметка сохранена');
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения');
    }
    setSavingNotes(false);
  };

  if (loading)
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-ink-secondary">Loading...</div>
      </DashboardLayout>
    );
  if (!student)
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-ink-secondary">Student not found</div>
      </DashboardLayout>
    );

  const totalMinutes = lessons.reduce((sum: number, l: any) => sum + (l.duration_seconds || 0), 0) / 60;
  const engagementList = lessons
    .map((l: any) => Number(l.engagement_score))
    .filter((n: number) => !Number.isNaN(n) && n > 0 && n <= 100);
  const engagementAvg = engagementList.length
    ? Math.round(engagementList.reduce((s: number, n: number) => s + n, 0) / engagementList.length)
    : null;
  const aiLessons = lessons.filter(
    (l: any) => l.summary || (l.strengths || []).length || (l.weaknesses || []).length
  );

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <Card className="p-6">
          <div className="flex flex-wrap items-start gap-4">
            <img src={getAvatarUrl(student.name)} alt="" className="w-16 h-16 rounded-2xl bg-surface-tinted" />
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-ink">{student.name}</h1>
                <span className={`text-sm px-3 py-1 rounded-full font-bold ${getLevelColor(student.level)}`}>
                  {student.level}
                </span>
              </div>
              <p className="text-sm text-ink-secondary mt-1">{student.goals || 'General English'}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-ink-muted flex-wrap">
                {student.email && <span>{student.email}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              {!editing && (
                <Button variant="secondary" size="sm" onClick={openEdit}>
                  Редактировать
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center p-3 rounded-2xl bg-surface-secondary">
              <p className="text-2xl font-black text-ink">{lessons.length}</p>
              <p className="text-xs text-ink-secondary">Уроков</p>
            </div>
            <div className="text-center p-3 rounded-2xl bg-surface-secondary">
              <p className="text-2xl font-black text-ink">{Math.round(totalMinutes)}</p>
              <p className="text-xs text-ink-secondary">Минут</p>
            </div>
            <div className="text-center p-3 rounded-2xl bg-surface-secondary">
              <p className="text-2xl font-black text-ink">{lessons.filter((l: any) => l.homework_id).length}</p>
              <p className="text-xs text-ink-secondary">ДЗ</p>
            </div>
          </div>
        </Card>

        {notice && (
          <div className="p-3 rounded-xl bg-brand/10 text-brand text-sm font-semibold">{notice}</div>
        )}
        {error && !editing && (
          <div className="p-3 rounded-xl bg-red-50 text-coral text-sm font-semibold">{error}</div>
        )}

        {/* Edit form */}
        {editing && (
          <form onSubmit={saveEdit}>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black text-ink">Редактировать ученика</h2>
                <span className="text-xs text-ink-muted">Данные ученика</span>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <Input label="Имя" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                />
                <Select
                  label="Уровень"
                  options={levelOptions}
                  value={form.level}
                  onChange={(e) => setField('level', e.target.value)}
                />
                <Input label="Цели" value={form.goals} onChange={(e) => setField('goals', e.target.value)} />
                <div className="md:col-span-2">
                  <Textarea
                    label="Заметки репетитора"
                    rows={4}
                    value={form.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                    placeholder="Что важно помнить об ученике"
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 text-coral text-sm font-semibold">{error}</div>
              )}

              <div className="flex gap-3 mt-6">
                <Button type="submit" loading={saving}>
                  Сохранить
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setError('');
                    setNotes(student.notes || '');
                  }}
                >
                  Отмена
                </Button>
              </div>
            </Card>
          </form>
        )}

        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* AI Progress */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-ink">Прогресс по данным ИИ</h2>
              {engagementAvg !== null && (
                <span className="px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold">
                  Вовлечённость {engagementAvg}%
                </span>
              )}
            </div>
            <SkillBars lessons={lessons} />
            <p className="text-xs text-ink-muted mt-4">
              {aiLessons.length > 0
                ? `На основе ${aiLessons.length} AI-анализов уроков`
                : 'Нейросеть ещё не анализировала занятия этого ученика'}
            </p>
          </Card>

          {/* Tutor notes */}
          <Card className="p-6">
            <h2 className="text-lg font-black text-ink mb-4">Заметки репетитора</h2>
            <Textarea
              rows={7}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Личные заметки: характер, темы, что повторить, домашка на будущее..."
            />
            <div className="flex justify-end mt-3">
              <Button size="sm" onClick={saveNotes} loading={savingNotes} disabled={notes === (student.notes || '')}>
                Сохранить заметку
              </Button>
            </div>
          </Card>
        </div>

        {/* AI notes (нейронка) */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-ink">AI-выводы по урокам</h2>
            <span className="text-xs text-ink-muted">Заметки нейросети</span>
          </div>

          {aiLessons.length === 0 ? (
            <p className="text-sm text-ink-secondary">
              Пока пусто. После обработки урока здесь появится разбор: сильные стороны, что доработать, лексика и
              план следующего занятия.
            </p>
          ) : (
            <div className="space-y-4">
              {aiLessons.map((l: any) => (
                <div key={l.id} className="rounded-2xl border border-surface-border p-4 bg-surface-tinted/40">
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <p className="text-sm font-black text-ink">
                      {new Date(l.created_at).toLocaleDateString()}
                      {l.engagement_score ? (
                        <span className="ml-2 text-xs font-bold text-brand">вовлечённость {l.engagement_score}%</span>
                      ) : null}
                    </p>
                    <Link href={`/lessons/${l.id}`} className="text-xs font-bold text-brand hover:underline">
                      Открыть урок →
                    </Link>
                  </div>

                  {l.summary && <p className="text-sm text-ink-secondary leading-relaxed mb-3">{l.summary}</p>}

                  <div className="grid sm:grid-cols-2 gap-3">
                    {(l.strengths || []).length > 0 && (
                      <div className="rounded-xl bg-brand/5 p-3">
                        <p className="text-xs font-black text-brand uppercase tracking-wider mb-1.5">
                          Сильные стороны
                        </p>
                        <ul className="space-y-1">
                          {(l.strengths || []).map((s: string, i: number) => (
                            <li key={i} className="text-xs text-ink-secondary leading-snug">
                              • {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(l.weaknesses || []).length > 0 && (
                      <div className="rounded-xl bg-coral/5 p-3">
                        <p className="text-xs font-black text-coral uppercase tracking-wider mb-1.5">
                          Что доработать
                        </p>
                        <ul className="space-y-1">
                          {(l.weaknesses || []).map((s: string, i: number) => (
                            <li key={i} className="text-xs text-ink-secondary leading-snug">
                              • {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {((l.key_vocabulary || []).length > 0 || (l.grammar_focus || []).length > 0) && (
                    <div className="mt-3 space-y-2">
                      {(l.key_vocabulary || []).length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-ink-muted">Слова:</span>
                          {(l.key_vocabulary || []).map((v: string, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-full bg-honey/10 text-amber-700 text-xs font-bold"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      )}
                      {(l.grammar_focus || []).length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-ink-muted">Грамматика:</span>
                          {(l.grammar_focus || []).map((v: string, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-full bg-sky/10 text-sky text-xs font-bold"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {l.next_lesson_recommendation && (
                    <div className="mt-3 rounded-xl bg-brand/5 p-3">
                      <p className="text-xs font-black text-brand uppercase tracking-wider mb-1">
                        План следующего урока
                      </p>
                      <p className="text-xs text-ink-secondary leading-relaxed whitespace-pre-line">
                        {l.next_lesson_recommendation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Lessons */}
        <Card className="p-6">
          <h2 className="text-lg font-black text-ink mb-4">Уроки</h2>
          {lessons.length === 0 ? (
            <p className="text-sm text-ink-secondary">Уроков пока нет</p>
          ) : (
            <div className="space-y-2">
              {lessons.map((l: any) => (
                <Link
                  key={l.id}
                  href={`/lessons/${l.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-secondary transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-surface-tinted flex items-center justify-center text-sm">
                    {l.status === 'completed' ? '✅' : '⏳'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink">{new Date(l.created_at).toLocaleDateString()}</p>
                    <p className="text-xs text-ink-secondary truncate">{l.summary || l.status}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-ink-secondary">
                      {l.duration_seconds ? formatDurationLong(l.duration_seconds) : '—'}
                    </span>
                    {l.engagement_score ? (
                      <p className="text-xs text-brand font-bold">{l.engagement_score}%</p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

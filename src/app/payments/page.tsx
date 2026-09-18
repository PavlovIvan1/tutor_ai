'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Student, Lesson } from '@/lib/types';

export default function PaymentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const { data: s } = supabase.from('students').select('*');
    setStudents(s || []);
    const { data: l } = supabase.from('lessons').select('*').order('created_at', { ascending: false });
    setLessons(l || []);
    setLoading(false);
  }, []);

  const studentMap = Object.fromEntries(students.map((s) => [s.id, s]));

  const payments = lessons
    .filter((l) => l.status === 'completed' && studentMap[l.student_id]?.price_per_lesson)
    .map((l) => {
      const student = studentMap[l.student_id];
      return {
        id: l.id,
        student: student.name,
        date: l.created_at.slice(0, 10),
        duration: l.duration_seconds ? Math.round(l.duration_seconds / 60) : 0,
        amount: student.price_per_lesson!,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalEarned = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-ink">Payments</h1>
        <p className="text-ink-secondary mt-1">Доходы от проведённых уроков.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Всего заработано</p>
          <p className="text-3xl font-black text-ink mt-2">{totalEarned.toLocaleString()} ₽</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Уроков</p>
          <p className="text-3xl font-black text-ink mt-2">{payments.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Средний чек</p>
          <p className="text-3xl font-black text-ink mt-2">
            {payments.length ? Math.round(totalEarned / payments.length).toLocaleString() : 0} ₽
          </p>
        </Card>
      </div>

      <Card>
        <div className="overflow-hidden rounded-3xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface-tinted">
                <th className="text-left px-6 py-3 font-bold text-ink-muted text-xs uppercase">Ученик</th>
                <th className="text-left px-6 py-3 font-bold text-ink-muted text-xs uppercase">Дата</th>
                <th className="text-left px-6 py-3 font-bold text-ink-muted text-xs uppercase">Длительность</th>
                <th className="text-right px-6 py-3 font-bold text-ink-muted text-xs uppercase">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-surface-border last:border-0 hover:bg-surface-tinted transition-colors">
                  <td className="px-6 py-4 font-bold text-ink">{p.student}</td>
                  <td className="px-6 py-4 text-ink-secondary">{p.date}</td>
                  <td className="px-6 py-4 text-ink-secondary">{p.duration} мин</td>
                  <td className="px-6 py-4 text-right font-black text-brand">{p.amount.toLocaleString()} ₽</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-ink-muted">
                    {loading ? 'Загрузка...' : 'Нет завершённых уроков. Проведите урок, чтобы увидеть доходы.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardLayout>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { createClient } from '@/lib/supabase/client';
import type { Student } from '@/lib/types';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const { data } = supabase.from('students').select('*');
    setStudents(data || []);
    setLoading(false);
  }, []);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-ink">Students</h1>
          <p className="text-ink-secondary mt-1">Manage your students and track their progress.</p>
        </div>
        <Link
          href="/students/new"
          className="inline-flex items-center gap-2 px-5 py-3 bg-brand text-white font-bold rounded-2xl shadow-[0_4px_0_0_var(--brand-shadow)] hover:bg-brand-dark transition-all active:translate-y-[2px] active:shadow-none text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Student
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-ink-muted">Loading...</div>
      ) : students.length === 0 ? (
        <Card>
          <EmptyState
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            title="No students yet"
            description="Add your first student to start tracking their progress and generating personalized homework."
            action={
              <Link
                href="/students/new"
                className="inline-flex items-center gap-2 px-5 py-3 bg-brand text-white font-bold rounded-2xl shadow-[0_4px_0_0_var(--brand-shadow)] hover:bg-brand-dark transition-all text-sm"
              >
                Add your first student
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {students.map((s) => (
            <Link key={s.id} href={`/students/${s.id}`}>
              <Card className="p-5 hover:shadow-card transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <img
                    src={`https://i.pravatar.cc/80?u=${s.id}`}
                    alt={s.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-ink">{s.name}</h3>
                    <p className="text-sm text-ink-secondary">{s.goals || 'Нет целей'}</p>
                  </div>
                  {s.lesson_day && (
                    <div className="text-right mr-2">
                      <p className="text-xs font-bold text-ink">{s.lesson_day}</p>
                      <p className="text-xs text-ink-muted">{s.lesson_time} · {s.lesson_duration || 60} мин</p>
                    </div>
                  )}
                  {s.price_per_lesson && (
                    <span className="text-sm font-black text-brand mr-2">{s.price_per_lesson.toLocaleString()} ₽</span>
                  )}
                  <span className="px-3 py-1 rounded-full bg-brand-light text-brand-dark text-xs font-bold">
                    {s.level}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

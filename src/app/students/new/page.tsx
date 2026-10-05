'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';

const levelOptions = [
  { value: 'A1', label: 'A1 - Beginner' },
  { value: 'A2', label: 'A2 - Elementary' },
  { value: 'B1', label: 'B1 - Intermediate' },
  { value: 'B2', label: 'B2 - Upper Intermediate' },
  { value: 'C1', label: 'C1 - Advanced' },
  { value: 'C2', label: 'C2 - Proficient' },
];

export default function NewStudentPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [level, setLevel] = useState('B1');
  const [goals, setGoals] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, level, goals, notes }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to create student');
        setLoading(false);
        return;
      }

      router.push('/students');
    } catch (err: any) {
      setError(err.message || 'Network error');
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-ink">Добавить ученика</h1>
          <p className="text-ink-secondary mt-1">Заполните данные ученика.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-8">
            <h2 className="text-lg font-bold text-ink mb-4">Основная информация</h2>
            <div className="space-y-5">
              <Input
                label="Имя"
                placeholder="Мария К."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Email (необязательно)"
                type="email"
                placeholder="maria@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Select
                label="Уровень английского"
                options={levelOptions}
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              />

              <Textarea
                label="Цели (необязательно)"
                placeholder="Подготовка к IELTS, деловой английский, разговорный и тд"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                rows={3}
              />

              <Textarea
                label="Заметки (необязательно)"
                placeholder="Дополнительная информация об ученике"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </Card>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-coral text-sm font-semibold">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" loading={loading}>
              Добавить ученика
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
            >
              Отмена
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

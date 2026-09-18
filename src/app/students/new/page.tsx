'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

const levelOptions = [
  { value: 'A1', label: 'A1 - Beginner' },
  { value: 'A2', label: 'A2 - Elementary' },
  { value: 'B1', label: 'B1 - Intermediate' },
  { value: 'B2', label: 'B2 - Upper Intermediate' },
  { value: 'C1', label: 'C1 - Advanced' },
  { value: 'C2', label: 'C2 - Proficient' },
];

const dayOptions = [
  { value: 'Понедельник', label: 'Понедельник' },
  { value: 'Вторник', label: 'Вторник' },
  { value: 'Среда', label: 'Среда' },
  { value: 'Четверг', label: 'Четверг' },
  { value: 'Пятница', label: 'Пятница' },
  { value: 'Суббота', label: 'Суббота' },
  { value: 'Воскресенье', label: 'Воскресенье' },
];

const durationOptions = [
  { value: '30', label: '30 минут' },
  { value: '45', label: '45 минут' },
  { value: '60', label: '60 минут' },
  { value: '90', label: '90 минут' },
  { value: '120', label: '120 минут' },
];

export default function NewStudentPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [level, setLevel] = useState('B1');
  const [goals, setGoals] = useState('');
  const [notes, setNotes] = useState('');
  const [lessonDay, setLessonDay] = useState('');
  const [lessonTime, setLessonTime] = useState('');
  const [lessonDuration, setLessonDuration] = useState('60');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('students').insert({
      tutor_id: user.id,
      name,
      email: email || null,
      level,
      goals: goals || null,
      notes: notes || null,
      lesson_day: lessonDay || null,
      lesson_time: lessonTime || null,
      lesson_duration: lessonDuration ? parseInt(lessonDuration) : null,
      price_per_lesson: price ? parseInt(price) : null,
      is_archived: false,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push('/students');
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-ink">Добавить ученика</h1>
          <p className="text-ink-secondary mt-1">Заполните данные ученика и расписание занятий.</p>
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

          <Card className="p-8">
            <h2 className="text-lg font-bold text-ink mb-4">Расписание и оплата</h2>
            <div className="space-y-5">
              <Select
                label="День занятия"
                options={[{ value: '', label: 'Не выбран' }, ...dayOptions]}
                value={lessonDay}
                onChange={(e) => setLessonDay(e.target.value)}
              />

              <Input
                label="Время занятия"
                type="time"
                value={lessonTime}
                onChange={(e) => setLessonTime(e.target.value)}
              />

              <Select
                label="Длительность урока"
                options={durationOptions}
                value={lessonDuration}
                onChange={(e) => setLessonDuration(e.target.value)}
              />

              <Input
                label="Стоимость урока (₽)"
                type="number"
                placeholder="2000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
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

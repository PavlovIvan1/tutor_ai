'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import { defaultHomeworkOptions, type HomeworkOptions } from '@/lib/prompts';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (options: HomeworkOptions) => void;
  loading?: boolean;
  studentName?: string;
}

const TYPE_OPTIONS = [
  { value: 'multiple_choice', label: 'Выбор ответа' },
  { value: 'fill_blank', label: 'Пропуск (заполни пропуск)' },
  { value: 'short_answer', label: 'Краткий ответ' },
  { value: 'writing', label: 'Письмо (эссе/письмо)' },
];

export default function HomeworkOptionsModal({ open, onClose, onConfirm, loading, studentName }: Props) {
  const [options, setOptions] = useState<HomeworkOptions>(defaultHomeworkOptions());

  useEffect(() => {
    if (open) setOptions(defaultHomeworkOptions());
  }, [open]);

  const set = <K extends keyof HomeworkOptions>(key: K, value: HomeworkOptions[K]) =>
    setOptions((o) => ({ ...o, [key]: value }));

  const toggleType = (value: string) => {
    setOptions((o) => {
      const has = o.questionTypes.includes(value);
      const next = has ? o.questionTypes.filter((t) => t !== value) : [...o.questionTypes, value];
      return { ...o, questionTypes: next.length ? next : [value] };
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Настройки домашнего задания"
      subtitle={studentName ? `Ученик: ${studentName}` : 'Нейросеть учтёт все параметры'}
      footer={
        <div className="flex gap-3">
          <Button onClick={() => onConfirm(options)} loading={loading} className="flex-1">
            Сгенерировать ДЗ
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Task count */}
        <div>
          <label className="block text-sm font-bold text-ink-secondary mb-2">Сколько заданий на закрепление?</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={20}
              value={options.taskCount}
              onChange={(e) => set('taskCount', parseInt(e.target.value))}
              className="flex-1 accent-[#4CAF50]"
            />
            <input
              type="number"
              min={1}
              max={20}
              value={options.taskCount}
              onChange={(e) => set('taskCount', Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              className="w-16 px-3 py-2 rounded-xl border border-surface-border text-center font-black text-ink"
            />
          </div>
          <div className="flex gap-2 mt-2">
            {[3, 5, 8, 10].map((n) => (
              <button
                key={n}
                onClick={() => set('taskCount', n)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                  options.taskCount === n ? 'bg-brand text-white' : 'bg-surface-tinted text-ink-secondary hover:bg-surface-border'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Theory */}
        <div className="rounded-2xl border border-surface-border p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeTheory}
              onChange={(e) => set('includeTheory', e.target.checked)}
              className="mt-1 w-4 h-4 accent-[#4CAF50]"
            />
            <span>
              <span className="block text-sm font-bold text-ink">Добавить теорию (новая тема)</span>
              <span className="block text-xs text-ink-muted mt-0.5">
                Нейросеть объяснит новую тему и даст примеры перед заданиями
              </span>
            </span>
          </label>
          {options.includeTheory && (
            <input
              type="text"
              value={options.theoryTopic || ''}
              onChange={(e) => set('theoryTopic', e.target.value)}
              placeholder="Тема: например Present Perfect, Reported Speech, essay introduction"
              className="mt-3 w-full px-4 py-2.5 rounded-xl border border-surface-border text-sm font-semibold text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          )}
        </div>

        {/* Checkboxes */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.englishOnly}
              onChange={(e) => set('englishOnly', e.target.checked)}
              className="mt-1 w-4 h-4 accent-[#4CAF50]"
            />
            <span>
              <span className="block text-sm font-bold text-ink">Полностью на английском</span>
              <span className="block text-xs text-ink-muted mt-0.5">
                Инструкции, вопросы, варианты и объяснения — всё на английском
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.examStyle}
              onChange={(e) => set('examStyle', e.target.checked)}
              className="mt-1 w-4 h-4 accent-[#4CAF50]"
            />
            <span>
              <span className="block text-sm font-bold text-ink">Экзаменационный стиль</span>
              <span className="block text-xs text-ink-muted mt-0.5">
                Формат и формулировки как в пробниках, загруженных в настройках (ОГЭ / ЕГЭ / IELTS)
              </span>
            </span>
          </label>
        </div>

        {/* Question types */}
        <div>
          <label className="block text-sm font-bold text-ink-secondary mb-2">Типы заданий</label>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((t) => {
              const active = options.questionTypes.includes(t.value);
              return (
                <button
                  key={t.value}
                  onClick={() => toggleType(t.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-colors ${
                    active
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-surface-border bg-white text-ink-muted hover:border-brand/40'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comment */}
        <div>
          <Textarea
            label="Комментарий для нейросети (необязательно)"
            rows={3}
            value={options.comment || ''}
            onChange={(e) => set('comment', e.target.value)}
            placeholder="Например: больше упора на диалоги, не давай длинных текстов, повтори артикли"
          />
        </div>
      </div>
    </Modal>
  );
}

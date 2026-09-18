'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import { useState } from 'react';

const mockNotes = [
  { id: 1, title: 'Мария — проблемы с Conditionals', content: 'Путает 2nd и 3rd conditional. Нужно больше практики с If + Past Perfect. На следующем уроке уделить 20 минут на это.', student: 'Мария К.', date: '2026-09-14', color: 'brand' },
  { id: 2, title: 'Даниил — Business English фразы', content: 'Выучили 15 фраз для переговоров: "I see your point", "Let me clarify", "That works for me". Хорошо запоминает, можно увеличить нагрузку.', student: 'Даниил П.', date: '2026-09-13', color: 'honey' },
  { id: 3, title: 'Общее — новые учебники', content: 'Заказать Cambridge English Result B2 для Марии и Speakout Intermediate для Даниила. Проверить наличие на Лабиринте.', student: 'General', date: '2026-09-12', color: 'ink' },
  { id: 4, title: 'Эмма — IELTS Speaking Part 2', content: 'Тема "Describe a place you visited" — Эмма говорила 1:20 вместо 2 минут. Нужно добавить linking phrases и расширять ответы.', student: 'Эмма С.', date: '2026-09-10', color: 'brand' },
];

export default function NotesPage() {
  const [notes, setNotes] = useState(mockNotes);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = notes.find((n) => n.id === selectedId);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-ink">Notes</h1>
          <p className="text-ink-secondary mt-1">Quick notes about your students and lessons.</p>
        </div>
        <button className="px-5 py-3 bg-brand text-white font-bold rounded-2xl shadow-[0_4px_0_0_var(--brand-shadow)] hover:bg-brand-dark transition-all active:translate-y-[2px] active:shadow-none text-sm">
          + New Note
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          {notes.map((note) => (
            <button
              key={note.id}
              onClick={() => setSelectedId(note.id)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                selectedId === note.id
                  ? 'border-brand bg-brand-light/10 shadow-card'
                  : 'border-surface-border bg-white hover:shadow-card'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-black text-ink truncate">{note.title}</p>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ml-2 ${note.color === 'brand' ? 'bg-brand' : note.color === 'honey' ? 'bg-honey' : 'bg-ink'}`} />
              </div>
              <p className="text-xs text-ink-muted truncate">{note.student} · {note.date}</p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <Card className="p-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-ink">{selected.title}</h2>
                <button className="text-xs font-bold text-ink-muted hover:text-coral transition-colors">Delete</button>
              </div>
              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-surface-tinted text-ink-secondary">{selected.student}</span>
                <span className="text-xs text-ink-muted">{selected.date}</span>
              </div>
              <p className="text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap">{selected.content}</p>
            </Card>
          ) : (
            <Card className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface-tinted flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-ink">Select a note</p>
              <p className="text-xs text-ink-muted mt-1">Choose a note from the list to view details</p>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

'use client';

import { calculateSkillsFromAI, type StudentSkills } from '@/lib/utils';

interface SkillBarsProps {
  /** Все уроки ученика с полями анализа (strengths, weaknesses, engagement_score...) */
  lessons?: any[];
  /** Либо один анализ (последний урок) */
  analysis?: any;
  compact?: boolean;
}

const SKILL_LABELS: { key: keyof StudentSkills; label: string; ru: string }[] = [
  { key: 'fluency', label: 'Fluency', ru: 'Беглость' },
  { key: 'grammar', label: 'Grammar', ru: 'Грамматика' },
  { key: 'vocabulary', label: 'Vocabulary', ru: 'Словарный запас' },
  { key: 'pronunciation', label: 'Pronunciation', ru: 'Произношение' },
  { key: 'comprehension', label: 'Comprehension', ru: 'Понимание' },
  { key: 'interaction', label: 'Interaction', ru: 'Вовлечённость' },
];

function getBarColor(percent: number): string {
  if (percent >= 83) return 'bg-emerald-500';
  if (percent >= 67) return 'bg-brand';
  if (percent >= 50) return 'bg-sky';
  if (percent >= 33) return 'bg-honey';
  return 'bg-coral';
}

export default function SkillBars({ lessons, analysis, compact = false }: SkillBarsProps) {
  const sources = [...(lessons || []), ...(analysis ? [analysis] : [])];
  const skills = calculateSkillsFromAI(sources);

  if (!skills) {
    return (
      <div className="rounded-2xl bg-surface-tinted px-4 py-5 text-center">
        <p className={`font-bold text-ink-secondary ${compact ? 'text-xs' : 'text-sm'}`}>
          AI-оценка появится после первого урока
        </p>
        {!compact && (
          <p className="text-xs text-ink-muted mt-1">
            Прогресс считается из выводов нейросети, а не из уровня ученика
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {SKILL_LABELS.map(({ key, label, ru }) => (
        <div key={key}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-ink-secondary ${compact ? 'text-[10px]' : 'text-xs'}`}>
              {compact ? label : `${ru} · ${label}`}
            </span>
            <span className={`font-bold text-ink ${compact ? 'text-[10px]' : 'text-xs'}`}>{skills[key]}%</span>
          </div>
          <div className={`w-full bg-surface-secondary rounded-full overflow-hidden ${compact ? 'h-1.5' : 'h-2.5'}`}>
            <div
              className={`h-full rounded-full transition-all duration-700 ${getBarColor(skills[key])}`}
              style={{ width: `${skills[key]}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

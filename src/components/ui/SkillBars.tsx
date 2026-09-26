'use client';

import { calculateStudentSkills, type StudentSkills } from '@/lib/utils';

interface SkillBarsProps {
  level: string;
  analysis?: any;
  compact?: boolean;
}

const SKILL_LABELS: { key: keyof StudentSkills; label: string }[] = [
  { key: 'fluency', label: 'Fluency' },
  { key: 'grammar', label: 'Grammar' },
  { key: 'vocabulary', label: 'Vocabulary' },
  { key: 'pronunciation', label: 'Pronunciation' },
  { key: 'comprehension', label: 'Comprehension' },
  { key: 'interaction', label: 'Interaction' },
];

function getBarColor(percent: number): string {
  if (percent >= 83) return 'bg-emerald-500';
  if (percent >= 67) return 'bg-brand';
  if (percent >= 50) return 'bg-sky';
  if (percent >= 33) return 'bg-honey';
  return 'bg-coral';
}

export default function SkillBars({ level, analysis, compact = false }: SkillBarsProps) {
  const skills = calculateStudentSkills(level, analysis);

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {SKILL_LABELS.map(({ key, label }) => (
        <div key={key}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-ink-secondary ${compact ? 'text-[10px]' : 'text-xs'}`}>{label}</span>
            <span className={`font-bold text-ink ${compact ? 'text-[10px]' : 'text-xs'}`}>{skills[key]}%</span>
          </div>
          <div className={`w-full bg-surface-secondary rounded-full overflow-hidden ${compact ? 'h-1.5' : 'h-2'}`}>
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

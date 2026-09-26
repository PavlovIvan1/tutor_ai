export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDurationLong(seconds: number) {
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getLevelColor(level: string) {
  const colors: Record<string, string> = {
    A1: 'bg-coral/10 text-coral',
    A2: 'bg-honey/10 text-amber-700',
    B1: 'bg-sky/10 text-sky',
    B2: 'bg-brand-light text-brand-dark',
    C1: 'bg-lavender/10 text-lavender',
    C2: 'bg-emerald-50 text-emerald-700',
  };
  return colors[level] || 'bg-surface-tinted text-ink-secondary';
}

export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Generate a deterministic fun avatar URL from a name.
 * Uses DiceBear adventurer-neutral style — looks like Xbox/Google auto-avatars.
 * No DB storage needed — avatar is always derived from the name.
 */
export function getAvatarUrl(name: string, size = 128): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  const seed = Math.abs(hash);
  return `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}&size=${size}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

/**
 * Generate a deterministic background color from a name.
 */
export function getAvatarBg(name: string): string {
  const colors = [
    'bg-brand-light text-brand-dark',
    'bg-honey/15 text-amber-700',
    'bg-sky/15 text-sky',
    'bg-coral/15 text-coral',
    'bg-lavender/15 text-lavender',
    'bg-emerald-50 text-emerald-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

const LEVEL_BASE: Record<string, number> = { A1: 17, A2: 33, B1: 50, B2: 67, C1: 83, C2: 100 };

export interface StudentSkills {
  fluency: number;
  grammar: number;
  vocabulary: number;
  pronunciation: number;
  comprehension: number;
  interaction: number;
}

export function calculateStudentSkills(level: string, analysis: any): StudentSkills {
  const base = LEVEL_BASE[level] || 50;
  const weaknesses: string[] = analysis?.weaknesses || [];
  const strengths: string[] = analysis?.strengths || [];
  const grammarFocus: string[] = analysis?.grammar_focus || [];
  const vocab: string[] = analysis?.key_vocabulary || [];

  const countMatches = (list: string[], keywords: string[]) =>
    list.filter(item => keywords.some(kw => item.toLowerCase().includes(kw.toLowerCase()))).length;

  const grammarWeak = countMatches(weaknesses, ['grammar', 'tense', 'verb', 'article', 'preposition', 'structure', 'sentence']);
  const grammarStrong = countMatches(strengths, ['grammar', 'tense', 'structure']);
  const vocabWeak = countMatches(weaknesses, ['vocabulary', 'word', 'lexical']);
  const vocabStrong = countMatches(strengths, ['vocabulary', 'word', 'lexical', 'expressions']);
  const fluencyWeak = countMatches(weaknesses, ['fluency', 'hesitation', 'pausing', 'speaking', 'pronunciation', 'confidence']);
  const fluencyStrong = countMatches(strengths, ['fluency', 'speaking', 'confidence', 'pronunciation', 'expressing']);

  const adjust = (base: number, weak: number, strong: number) =>
    Math.max(5, Math.min(100, base - weak * 8 + strong * 5));

  return {
    fluency: adjust(base, fluencyWeak, fluencyStrong),
    grammar: adjust(base, grammarWeak, grammarStrong),
    vocabulary: adjust(base, vocabWeak, vocabStrong),
    pronunciation: adjust(base, fluencyWeak, fluencyStrong),
    comprehension: adjust(base, 0, Math.min(strengths.length, 2)),
    interaction: adjust(base, fluencyWeak, Math.min(strengths.length, 2)),
  };
}

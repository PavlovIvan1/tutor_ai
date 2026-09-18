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
  // Hash the name to get a deterministic seed
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  const seed = Math.abs(hash);
  return `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${seed}&size=${size}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
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

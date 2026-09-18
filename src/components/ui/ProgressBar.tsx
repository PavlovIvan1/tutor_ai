'use client';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'brand' | 'sky' | 'coral' | 'honey';
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export default function ProgressBar({
  value,
  max = 100,
  color = 'brand',
  size = 'md',
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const colors = {
    brand: 'bg-brand',
    sky: 'bg-sky',
    coral: 'bg-coral',
    honey: 'bg-honey',
  };

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
  };

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-xs font-bold text-ink-muted">{Math.round(pct)}%</span>
        </div>
      )}
      <div className={`w-full bg-surface-tinted rounded-full ${heights[size]}`}>
        <div
          className={`${colors[color]} ${heights[size]} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

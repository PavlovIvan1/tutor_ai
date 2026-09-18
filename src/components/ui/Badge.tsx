interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-surface-tinted text-ink-secondary',
    success: 'bg-brand-light text-brand-dark',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-coral',
    info: 'bg-sky/10 text-sky',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

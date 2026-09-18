import { forwardRef, type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-bold rounded-2xl transition-all duration-200 active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-brand text-white shadow-[0_4px_0_0_var(--brand-shadow)] hover:bg-brand-dark active:shadow-none',
      secondary: 'bg-white text-ink border-2 border-surface-border shadow-[0_3px_0_0_#E8E8ED] hover:border-brand hover:text-brand active:shadow-none',
      ghost: 'bg-transparent text-ink-secondary hover:text-ink hover:bg-surface-tinted',
      danger: 'bg-coral text-white shadow-[0_4px_0_0_#d32f2f] hover:bg-red-500 active:shadow-none',
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-sm',
      lg: 'px-8 py-4 text-base',
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;

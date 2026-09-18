import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-bold text-ink-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-3 rounded-xl border border-surface-border bg-white text-ink font-semibold placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all ${error ? 'border-coral' : ''} ${className}`}
          {...props}
        />
        {error && (
          <p className="text-sm text-coral">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;

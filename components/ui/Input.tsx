import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-xl bg-bg-elevated border border-border px-4 py-2.5 text-sm',
          'placeholder:text-fg-subtle',
          'focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40',
          'transition-all',
          'shadow-sm',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

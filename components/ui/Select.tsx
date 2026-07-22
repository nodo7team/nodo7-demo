import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';
import { ChevronDown } from 'lucide-react';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'w-full appearance-none rounded-xl bg-bg-elevated border border-border px-4 py-2.5 pr-10 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40',
            'transition-all cursor-pointer',
            'shadow-sm',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle pointer-events-none" />
      </div>
    );
  },
);
Select.displayName = 'Select';

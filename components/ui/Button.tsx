'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactElement } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent/40 whitespace-nowrap',
  {
    variants: {
      variant: {
        primary:
          'bg-accent text-accent-fg shadow-button hover:shadow-button-hover hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
        secondary:
          'bg-bg-elevated text-fg border border-border shadow-sm hover:bg-bg-muted hover:border-fg-subtle',
        ghost:
          'bg-transparent text-fg-muted hover:text-fg hover:bg-bg-muted',
        danger:
          'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/15 hover:border-danger/30',
        outline:
          'bg-transparent border border-border text-fg-muted hover:bg-bg-muted hover:text-fg',
      },
      size: {
        sm: 'h-9 px-3.5 text-xs',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, asChild, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, className }));

    if (asChild && children && typeof children === 'object' && 'props' in (children as any)) {
      const child = children as ReactElement;
      return (
        <child.type
          {...child.props}
          className={cn(classes, child.props.className)}
          {...props}
        />
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

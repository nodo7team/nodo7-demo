'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function Sheet({ open, onClose, title, subtitle, children, className }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-fg/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative w-full md:w-[560px] h-full bg-bg-elevated flex flex-col shadow-2xl',
        'md:border-l border-border',
        className,
      )}>
        <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            {title && <h2 className="text-lg font-bold text-fg">{title}</h2>}
            {subtitle && <p className="text-sm text-fg-muted mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="ml-4 -mr-2 -mt-1 p-2 rounded-xl hover:bg-bg-muted text-fg-muted hover:text-fg transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleClose = () => onClose();
    el.addEventListener('close', handleClose);
    return () => el.removeEventListener('close', handleClose);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === ref.current) onClose();
  };

  return (
    <dialog
      ref={ref}
      onClick={handleBackdropClick}
      className={cn(
        'backdrop:bg-fg/40 backdrop:backdrop-blur-sm',
        'bg-bg-elevated border border-border rounded-2xl',
        'text-fg p-0',
        'w-[calc(100vw-1.5rem)] max-w-lg',
        'max-h-[85vh] overflow-hidden',
        'open:animate-scale-in',
        'shadow-2xl',
        'mt-auto mb-auto md:m-auto',
        className,
      )}
    >
      <div className="flex items-start justify-between px-6 pt-6 pb-2">
        <div className="flex-1 min-w-0">
          {title && <h2 className="text-lg font-bold text-fg">{title}</h2>}
          {description && <p className="text-sm text-fg-muted mt-1">{description}</p>}
        </div>
        <button
          onClick={onClose}
          className="ml-4 -mr-2 -mt-2 p-2 rounded-xl hover:bg-bg-muted text-fg-muted hover:text-fg transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-6 pb-6 max-h-[calc(90vh-100px)] overflow-y-auto">{children}</div>
    </dialog>
  );
}

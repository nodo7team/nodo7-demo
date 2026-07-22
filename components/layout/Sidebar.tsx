'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Tv, MessageSquareText, Settings, LogOut,
  CalendarClock, Activity, CircleDollarSign, PlayCircle, MoreHorizontal, X,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useState, useEffect } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/expiring-today', label: 'Vencimientos', icon: CalendarClock },
  { href: '/sales', label: 'Ventas', icon: CircleDollarSign },
  { href: '/clients', label: 'Clientes', icon: Users },
  { href: '/lines', label: 'Líneas', icon: Tv },
  { href: '/demos', label: 'Demos', icon: PlayCircle },
  { href: '/templates', label: 'Plantillas', icon: MessageSquareText },
  { href: '/activity', label: 'Historial', icon: Activity },
  { href: '/settings', label: 'Ajustes', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-bg-panel border-r border-border">
      <div className="px-5 pt-6 pb-8">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-bg">
            <img src="/logopaneliptv.png" alt="OptiMind IPTV Panel" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="font-display text-sm font-bold text-fg group-hover:text-accent transition-colors">OptiMind</div>
            <div className="text-[10px] font-semibold text-fg-muted">IPTV Panel</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden',
                active
                  ? 'bg-accent/[.1] text-fg font-semibold'
                  : 'text-fg-muted hover:bg-bg-muted hover:text-fg',
              )}
            >
              {active && (
                <span className="absolute inset-y-2 left-0 w-[3px] bg-accent rounded-r-full" />
              )}
              <Icon className={cn('h-5 w-5 shrink-0 transition-colors duration-200', active ? 'text-accent' : '')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-fg-subtle hover:text-danger hover:bg-danger/[.08] transition-all duration-200 group"
          >
            <LogOut className="h-4 w-4 shrink-0 group-hover:translate-x-0.5 transition-transform duration-200" />
            <span>Cerrar sesión</span>
          </button>
        </form>
      </div>
    </aside>
  );
}

// Los 4 ítems fijos del tab bar
const MOBILE_PRIMARY = ['/dashboard', '/expiring-today', '/clients', '/lines'];

// Los que van en el drawer (todo lo que no es primary)
const MOBILE_SECONDARY = NAV_ITEMS.filter((i) => !MOBILE_PRIMARY.includes(i.href));

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primaryItems = NAV_ITEMS.filter((i) => MOBILE_PRIMARY.includes(i.href));

  // Cierra el drawer cuando cambia la ruta
  useEffect(() => { setOpen(false); }, [pathname]);

  // Bloquea scroll del body cuando el drawer está abierto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // ¿algún ítem secundario está activo? → resaltar el botón "Más"
  const secondaryActive = MOBILE_SECONDARY.some(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );

  return (
    <>
      {/* ── Tab bar fijo ─────────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-bg-panel/95 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_hsl(0_0%_0%/0.15)]">
        <div className="grid grid-cols-5 safe-bottom">

          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-3 relative transition-all duration-200',
                  active ? 'text-accent' : 'text-fg-muted',
                )}
              >
                {active && (
                  <span className="absolute top-0 inset-x-5 h-[2px] bg-accent rounded-b-full" />
                )}
                <div className={cn(
                  'flex items-center justify-center rounded-xl transition-all duration-200',
                  active ? 'scale-110' : '',
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold truncate max-w-[56px] text-center leading-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Botón "Más" */}
          <button
            onClick={() => setOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-3 relative transition-all duration-200',
              (open || secondaryActive) ? 'text-accent' : 'text-fg-muted',
            )}
          >
            {secondaryActive && !open && (
              <span className="absolute top-0 inset-x-5 h-[2px] bg-accent rounded-b-full" />
            )}
            <div className={cn(
              'flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200',
              open ? 'bg-accent/15 scale-110' : '',
            )}>
              <MoreHorizontal className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold leading-tight">Más</span>
          </button>
        </div>
      </nav>

      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setOpen(false)}
      />

      {/* ── Bottom sheet ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          'md:hidden fixed bottom-0 inset-x-0 z-[60] bg-bg-panel rounded-t-3xl shadow-2xl',
          'transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl overflow-hidden bg-bg shrink-0">
              <img src="/logopaneliptv.png" alt="Panel" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-bold text-sm text-fg">OptiMind</div>
              <div className="text-[10px] text-fg-subtle font-medium">IPTV Panel</div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-xl bg-bg-muted text-fg-muted hover:text-fg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Grid de ítems secundarios */}
        <div className="px-4 py-4 grid grid-cols-3 gap-2">
          {MOBILE_SECONDARY.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200 active:scale-95',
                  active
                    ? 'bg-accent/10 border-accent/25 text-accent'
                    : 'bg-bg border-border text-fg-muted hover:bg-bg-muted hover:text-fg',
                )}
              >
                <Icon className={cn('h-6 w-6', active && 'text-accent')} />
                <span className="text-[11px] font-bold text-center leading-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Logout */}
        <div className="px-4 pb-6 pt-1">
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-danger/8 hover:bg-danger/15 border border-danger/15 text-danger text-sm font-bold transition-all duration-200 active:scale-[0.98]"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

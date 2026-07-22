import { Sidebar, MobileNav } from '@/components/layout/Sidebar';
import { GlobalKeyboardShortcuts } from '@/components/GlobalKeyboardShortcuts';

export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto pb-20 md:pb-0">{children}</main>
      <MobileNav />
      <GlobalKeyboardShortcuts />
    </div>
  );
}

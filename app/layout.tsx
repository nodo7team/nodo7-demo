import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Poppins, Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { Providers } from './providers';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

const display = Poppins({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'OptiMind - IPTV Panel',
  description: 'Gestión unificada de ClickTV y Raptor TV',
  manifest: '/manifest.json',
  icons: {
    icon: '/logopaneliptv.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#f1f3f7',
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <Providers>
            {children}
            <Toaster
              position="top-right"
              theme="system"
              toastOptions={{
                style: {
                  background: 'hsl(var(--bg-elevated))',
                  border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--fg))',
                  fontFamily: 'var(--font-sans), system-ui, sans-serif',
                  fontSize: '13px',
                  borderRadius: '14px',
                  boxShadow: '0 8px 32px -4px rgba(0,0,0,0.1)',
                },
              }}
            />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}

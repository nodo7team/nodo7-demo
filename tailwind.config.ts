import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        bg: {
          DEFAULT: 'hsl(var(--bg))',
          elevated: 'hsl(var(--bg-elevated))',
          muted: 'hsl(var(--bg-muted))',
          panel: 'hsl(var(--bg-panel))',
        },
        fg: {
          DEFAULT: 'hsl(var(--fg))',
          muted: 'hsl(var(--fg-muted))',
          subtle: 'hsl(var(--fg-subtle))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          fg: 'hsl(var(--accent-fg))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          subtle: 'hsl(var(--success-subtle))',
          soft: 'hsl(var(--success-bg))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          subtle: 'hsl(var(--warning-subtle))',
          soft: 'hsl(var(--warning-bg))',
        },
        danger: {
          DEFAULT: 'hsl(var(--danger))',
          subtle: 'hsl(var(--danger-subtle))',
          soft: 'hsl(var(--danger-bg))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          subtle: 'hsl(var(--info-subtle))',
          soft: 'hsl(var(--info-bg))',
        },
        border: 'hsl(var(--border))',
      },
      borderRadius: {
        sm: 'calc(var(--radius) - 6px)',
        md: 'calc(var(--radius) - 3px)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
      },
      boxShadow: {
        'card':       'inset 0 1px 0 hsl(var(--fg) / 0.04), 0 1px 2px hsl(0 0% 0% / 0.06), 0 4px 16px -4px hsl(0 0% 0% / 0.1)',
        'card-hover': 'inset 0 1px 0 hsl(var(--fg) / 0.05), 0 4px 16px hsl(0 0% 0% / 0.1), 0 8px 32px -4px hsl(var(--accent) / 0.18)',
        'button':     '0 4px 14px -3px hsl(var(--accent) / 0.35), 0 1px 3px hsl(0 0% 0% / 0.1)',
        'button-hover': '0 8px 28px -4px hsl(var(--accent) / 0.5), 0 2px 6px hsl(0 0% 0% / 0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

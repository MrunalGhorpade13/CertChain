/** @type {import('tailwindcss').Config} */
// tailwind.config.js
// Tailwind v3 configuration for the Certificate Verification System.
// - Dark mode is enabled via the 'class' strategy so we can toggle it programmatically.
// - The content array tells Tailwind where to look for class usage so unused styles are purged.
// - We extend the default theme with custom colors and glassmorphism-friendly backdrop values.

export default {
  // 'class' strategy: add/remove the `dark` class on <html> to switch modes
  darkMode: 'class',

  // Files Tailwind will scan for class names
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],

  theme: {
    extend: {
      // ── Custom colour palette ─────────────────────────────────────────────
      colors: {
        // Deep dark backgrounds
        'dark-bg':      '#07080f',
        'dark-card':    '#0d0f1e',
        'dark-border':  '#1e2140',

        // Neon accent – primary purple/blue gradient stops
        'neon-blue':    '#3b82f6',
        'neon-purple':  '#8b5cf6',
        'neon-cyan':    '#06b6d4',

        // Status colours
        'success-glow': '#10b981',
        'danger-glow':  '#ef4444',
      },

      // ── Custom fonts ──────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },

      // ── Backdrop blur extensions ──────────────────────────────────────────
      backdropBlur: {
        xs: '2px',
      },

      // ── Box shadow glow effects ───────────────────────────────────────────
      boxShadow: {
        'glow-blue':    '0 0 20px rgba(59,130,246,0.4)',
        'glow-purple':  '0 0 20px rgba(139,92,246,0.4)',
        'glow-green':   '0 0 20px rgba(16,185,129,0.4)',
        'glow-red':     '0 0 20px rgba(239,68,68,0.4)',
        'glass':        '0 8px 32px rgba(0,0,0,0.4)',
      },

      // ── Animation keyframes ───────────────────────────────────────────────
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float':      'float 3s ease-in-out infinite',
        'shimmer':    'shimmer 2s linear infinite',
      },
    },
  },

  plugins: [],
};

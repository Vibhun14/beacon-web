/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Beacon palette — semantic colors driven by CSS variables
        ink: 'var(--color-ink)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        muted: 'var(--color-muted)',
        body: 'var(--color-body)',
        light: 'var(--color-light)',
        'beacon-dim': 'var(--color-beacon-dim)',
        // Fixed accent colors
        beacon: '#5B8AF0',
        success: '#3ECFA0',
        warn: '#F0A953',
        danger: '#E05C5C',
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
        glow: '0 0 24px rgba(91,138,240,0.25)',
      },
      keyframes: {
        pulse_beacon: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.08)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'gradient-drift': {
          '0%, 100%': { transform: 'scale(1) translate(0%, 0%)' },
          '50%': { transform: 'scale(1.2) translate(4%, 3%)' },
        },
        'float-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        beacon: 'pulse_beacon 2.8s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out both',
        marquee: 'marquee 28s linear infinite',
        'gradient-drift': 'gradient-drift 12s ease-in-out infinite',
        'float-up': 'float-up 0.6s ease-out both',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Arrière-plans ──────────────────────────────────
        bg: {
          DEFAULT: 'var(--bg)',
          deep:    'var(--bg-deep)',
          card:    'var(--bg-card)',
          hover:   'var(--bg-hover)',
          input:   'var(--bg-input)',
        },
        // ── Accent vert I-Gym ──────────────────────────────
        accent: {
          DEFAULT: 'var(--accent)',
          light:   'var(--accent-light)',
          dark:    'var(--accent-dark)',
          glow:    'var(--accent-glow)',
          muted:   'var(--accent-muted)',
        },
        // ── Statuts ────────────────────────────────────────
        danger:  { DEFAULT: 'var(--danger)', light: 'var(--danger-light)', glow: 'var(--danger-glow)', muted: 'var(--danger-muted)' },
        warning: { DEFAULT: 'var(--warning)', light: 'var(--warning-light)', glow: 'var(--warning-glow)', muted: 'var(--warning-muted)' },
        info:    { DEFAULT: 'var(--info)', light: 'var(--info-light)', glow: 'var(--info-glow)', muted: 'var(--info-muted)' },
        on: {
          accent: 'var(--on-accent)',
          brand:  'var(--on-brand)',
        },
        // ── Texte ──────────────────────────────────────────
        text: {
          DEFAULT: 'var(--text)',
          strong:  'var(--text-strong)',
          muted:   'var(--text-muted)',
          dim:     'var(--text-dim)',
        },
        // ── Bordures ───────────────────────────────────────
        border: {
          DEFAULT: 'var(--border)',
          hover:   'var(--border-hover)',
          accent:  'var(--border-accent)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card':        '0 4px 24px var(--shadow-card), inset 0 1px 0 var(--shadow-card-inset)',
        'card-hover':  '0 8px 40px var(--shadow-card-hover), inset 0 1px 0 var(--shadow-card-inset-hover)',
        'accent':      '0 0 24px var(--shadow-accent)',
        'accent-lg':   '0 0 48px var(--shadow-accent-lg)',
        'glow-danger': '0 0 20px var(--danger-glow)',
        'glow-info':   '0 0 20px var(--info-glow)',
      },
      animation: {
        'pulse-green':  'pulseGreen 2.5s ease-in-out infinite',
        'flame':        'flame 1.5s ease-in-out infinite alternate',
        'slide-in':     'slideIn 0.35s cubic-bezier(0.4,0,0.2,1)',
        'slide-up':     'slideUp 0.4s cubic-bezier(0.4,0,0.2,1)',
        'fade-in':      'fadeIn 0.4s ease-out',
        'scale-up':     'scaleUp 0.35s cubic-bezier(0.4,0,0.2,1)',
        'bounce-in':    'bounceIn 0.6s cubic-bezier(0.68,-0.55,0.27,1.55)',
        'shimmer':      'shimmer 2s infinite',
        'float':        'float 3s ease-in-out infinite',
      },
      keyframes: {
        pulseGreen: {
          '0%,100%': { boxShadow: '0 0 0 0 var(--shadow-accent)' },
          '50%':     { boxShadow: '0 0 0 12px transparent' },
        },
        flame: {
          '0%':   { transform: 'scale(1) rotate(-3deg)', filter: 'hue-rotate(0deg)' },
          '100%': { transform: 'scale(1.15) rotate(3deg)', filter: 'hue-rotate(20deg)' },
        },
        slideIn: {
          from: { transform: 'translateX(-16px)', opacity: '0' },
          to:   { transform: 'translateX(0)',      opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        scaleUp: {
          from: { transform: 'scale(0.96)', opacity: '0' },
          to:   { transform: 'scale(1)',    opacity: '1' },
        },
        bounceIn: {
          '0%':   { transform: 'scale(0)', opacity: '0' },
          '70%':  { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)',  opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gym-hero':        'var(--bg-gradient)',
        'card-shine':      'linear-gradient(105deg, transparent 40%, var(--card-shine) 50%, transparent 60%)',
      },
    },
  },
  plugins: [],
}

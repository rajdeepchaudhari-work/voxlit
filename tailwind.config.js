/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        // Brand palette from BRAND_IDENTITY.md
        'electron-violet': '#7C3AED',
        'neon-lavender': '#A78BFA',
        'plasma-cyan': '#22D3EE',
        'ice-blue': '#67E8F9',
        'void-black': '#0A0A0F',
        'deep-space': '#111118',
        'midnight-slate': '#1A1A26',
        'graphite-haze': '#24243A',
        'dim-edge': '#2E2E4A',
        'star-white': '#F0EEFF',
        'mist-gray': '#9B96B8',
        'dim-slate': '#5A5578',
        'aurora-green': '#10B981',
        'amber-pulse': '#F59E0B',
        'crimson-flash': '#EF4444',
        'hot-cyan': '#22D3EE'
      },
      fontFamily: {
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'monospace']
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        full: '9999px'
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
        16: '64px',
        20: '80px',
        24: '96px'
      },
      boxShadow: {
        'glow-violet': '0 0 20px rgba(124,58,237,0.4), 0 0 60px rgba(124,58,237,0.15)',
        'glow-cyan': '0 0 20px rgba(34,211,238,0.45), 0 0 60px rgba(34,211,238,0.15)',
        'glow-combo': '0 0 30px rgba(124,58,237,0.3), 0 0 80px rgba(34,211,238,0.1)'
      },
      animation: {
        'waveform': 'waveform 800ms ease-in-out infinite',
        'pulse-dot': 'pulse-dot 1200ms ease-in-out infinite'
      },
      keyframes: {
        waveform: {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' }
        },
        'pulse-dot': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.3)', opacity: '0.7' }
        }
      }
    }
  },
  plugins: []
}

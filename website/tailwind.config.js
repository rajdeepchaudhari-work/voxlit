/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'base':      '#FFFDF7',
        'surface-1': '#FFFFFF',
        'surface-2': '#F5F0E8',
        'surface-3': '#EDE8DE',
        'accent':    '#665DF5',
        'accent-dim':'#4F49CC',
        'amber':     '#FFEB3B',
        'ink':       '#0A0A0A',
        'ink-2':     '#333333',
        'ink-3':     '#666666',
        'success':   '#00C853',
        'danger':    '#FF1744',
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"Geist"', 'Inter', 'system-ui', 'sans-serif'],
        body:    ['Inter', '"Geist"', '-apple-system', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"Geist Mono"', '"SF Mono"', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}

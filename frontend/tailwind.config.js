/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#07080a',
          900: '#0c0e14',
          800: '#141822',
          700: '#1e2433',
          600: '#2a3245',
        },
        neon: {
          cyan: '#06b6d4',
          purple: '#a855f7',
          magenta: '#ec4899',
          green: '#22c55e',
          orange: '#f97316',
          blue: '#3b82f6',
        },
        severity: {
          low: '#22c55e',
          medium: '#eab308',
          high: '#f97316',
          critical: '#ef4444',
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 12px 2px rgba(6,182,212,0.35), inset 0 0 12px 0 rgba(6,182,212,0.06)',
        'glow-purple': '0 0 12px 2px rgba(168,85,247,0.35), inset 0 0 12px 0 rgba(168,85,247,0.06)',
        'glow-green': '0 0 12px 2px rgba(34,197,94,0.35), inset 0 0 12px 0 rgba(34,197,94,0.06)',
        'glow-orange': '0 0 12px 2px rgba(249,115,22,0.35), inset 0 0 12px 0 rgba(249,115,22,0.06)',
        'glow-red': '0 0 12px 2px rgba(239,68,68,0.35), inset 0 0 12px 0 rgba(239,68,68,0.06)',
        'glow-blue': '0 0 12px 2px rgba(59,130,246,0.35), inset 0 0 12px 0 rgba(59,130,246,0.06)',
      },
      borderColor: {
        'glow-cyan': 'rgba(6,182,212,0.4)',
        'glow-purple': 'rgba(168,85,247,0.4)',
        'glow-green': 'rgba(34,197,94,0.4)',
        'glow-orange': 'rgba(249,115,22,0.4)',
        'glow-red': 'rgba(239,68,68,0.4)',
      },
    },
  },
  plugins: [],
}

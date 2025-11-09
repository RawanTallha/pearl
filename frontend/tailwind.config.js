/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pearl: {
          primary: '#38bdf8',
          accent: '#f97316',
          surface: '#111827',
          'surface-light': '#1f2937',
          success: '#22c55e',
          warning: '#facc15',
          danger: '#ef4444',
        },
      },
    },
  },
  plugins: [],
}


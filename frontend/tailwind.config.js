/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pearl: {
          primary: ': #4985e0;',
          accent: '#f7c3aa',
          surface: '#1a243d',
          'surface-light': '#24304a',
          success: '#4cd9b9',
          warning: '#f8d06a',
          danger: '#f77e7e',
        },
      },
    },
  },
  plugins: [],
}


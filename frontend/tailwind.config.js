/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        military: {
          900: '#0a0f0a',
          800: '#111a0f',
          700: '#1a2b18',
          600: '#243d21',
          500: '#2d5229',
          400: '#3d7035',
          300: '#5a9e50',
          200: '#8bc97f',
          100: '#c4e8bc',
          50:  '#edf7eb',
        },
        gold: {
          500: '#c8a84b',
          400: '#d4b76a',
          300: '#e0c98a',
        },
      },
      fontFamily: {
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-orbitron)', 'monospace'],
      },
    },
  },
  plugins: [],
};

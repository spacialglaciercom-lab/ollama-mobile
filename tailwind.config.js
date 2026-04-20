/** @type {import('tailwindcss').Config} */

module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
        },
        background: {
          DEFAULT: '#0a0a0a',
          paper: '#1a1a1a',
          card: '#2a2a2a',
        },
        border: {
          DEFAULT: '#3a3a3a',
        },
      },
    },
  },
  plugins: [],
};

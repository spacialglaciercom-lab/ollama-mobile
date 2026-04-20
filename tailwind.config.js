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
        accent: '#30d158',
        blue: '#0a84ff',
        danger: '#ff453a',
        bg: '#000000',
        surface: '#1c1c1e',
        surface2: '#2c2c2e',
        surface3: '#3a3a3c',
        sep: 'rgba(84,84,88,0.65)',
        userBubble: '#1a3a5c',
      },
    },
  },
  plugins: [],
};
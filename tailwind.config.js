/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#FF462B',
        'primary-dark': '#E02E1B',
        'primary-light': '#FF6F5E',
        secondary: '#0B0F19',
        accent: '#111827',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        surface: '#FFFFFF',
        background: '#F8FAFC',
      },
    },
  },
  plugins: [],
};

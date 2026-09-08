/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './features/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        void: '#0f0b1e',
        ink: '#17122b',
      },
      fontFamily: {
        display: ['System'],
      },
    },
  },
  plugins: [],
};

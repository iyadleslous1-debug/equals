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
        elevated: '#241b40',
        primary: '#d9a441',
        onPrimary: '#0f0b1e',
        secondary: '#8b7bc7',
        text: '#f4f1fa',
        muted: '#b8b0d1',
        faint: '#8a83a3',
        border: '#2e2547',
        destructive: '#dc2626',
        onDestructive: '#ffffff',
        success: '#34d399',
        warning: '#f59e0b',
        onWarning: '#0f0b1e',
      },
      fontFamily: {
        display: ['System'],
      },
    },
  },
  plugins: [],
};

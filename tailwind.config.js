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
        void: '#0f1419',
        ink: '#1a2028',
        elevated: '#252d38',
        primary: '#3368a0',
        onPrimary: '#ffffff',
        secondary: '#66a3bf',
        tertiary: '#c8dfdb',
        text: '#f2efe7',
        muted: '#8a9ba8',
        faint: '#8a9ba8',
        border: '#2a3441',
        destructive: '#e5484d',
        onDestructive: '#ffffff',
        success: '#30a46c',
        warning: '#f5a524',
        onWarning: '#0f1419',
        primaryTint: 'rgba(51,104,160,0.15)',
        scrim: 'rgba(15,20,25,0.7)',
      },
      fontFamily: {
        display: ['System'],
      },
    },
  },
  plugins: [],
};

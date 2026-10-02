export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        muted: '#5b6472',
        line: '#e7e7ea',
        canvas: '#f7f7f8',
        navy: {
          50: '#eef3f9',
          100: '#d9e4f0',
          200: '#b3c8de',
          DEFAULT: '#002E5D',
          600: '#003b77',
          700: '#00244a',
        },
        success: { 50: '#ecfdf3', DEFAULT: '#16a34a', 700: '#15803d' },
        warning: { 50: '#fffbeb', DEFAULT: '#b45309' },
        danger: { 50: '#fef2f2', DEFAULT: '#dc2626' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
    },
  },
}

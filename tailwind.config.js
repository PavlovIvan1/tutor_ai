/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#4CAF50',
          dark: '#43A047',
          light: '#E8F5E9',
          shadow: '#2E7D32',
        },
        surface: {
          DEFAULT: '#FAFAF8',
          card: '#FFFFFF',
          tinted: '#F5F7F3',
          border: '#E8E8ED',
          'border-light': '#F0F0F5',
        },
        ink: {
          DEFAULT: '#1A1A2E',
          secondary: '#5A5A72',
          muted: '#8E8EA0',
        },
        coral: '#FF6B6B',
        sky: '#4B9CDB',
        honey: '#FFC800',
        lavender: '#7C4DFF',
      },
      fontFamily: {
        sans: ['M PLUS Rounded 1c', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        'xl': '20px',
        '2xl': '28px',
        '3xl': '32px',
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(0,0,0,0.04)',
        'card': '0 4px 16px rgba(0,0,0,0.06)',
        'elevated': '0 8px 32px rgba(0,0,0,0.08)',
        'float': '0 16px 48px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
};

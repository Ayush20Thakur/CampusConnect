/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#EEF2F7',
          100: '#D5E0EE',
          200: '#AAC1DC',
          300: '#7FA3CB',
          400: '#5484B9',
          500: '#2966A8',
          600: '#1E5190',
          700: '#183D6E',
          800: '#183153',
          900: '#0F1F35',
        },
        teal: {
          50: '#F0FDF9',
          100: '#CCFBEF',
          200: '#99F6DF',
          300: '#5EEEC9',
          400: '#2DD4AE',
          500: '#0D9488',
          600: '#0B7A71',
          700: '#096059',
          800: '#074742',
          900: '#042E2B',
        },
        amber: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F4B942',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'card': '12px',
        'card-lg': '16px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(24, 49, 83, 0.08), 0 1px 2px -1px rgba(24, 49, 83, 0.05)',
        'card-md': '0 4px 6px -1px rgba(24, 49, 83, 0.08), 0 2px 4px -2px rgba(24, 49, 83, 0.05)',
        'card-lg': '0 10px 15px -3px rgba(24, 49, 83, 0.08), 0 4px 6px -4px rgba(24, 49, 83, 0.05)',
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #183153 0%, #1E5190 50%, #0D9488 100%)',
        'gradient-card': 'linear-gradient(135deg, #183153 0%, #2966A8 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}

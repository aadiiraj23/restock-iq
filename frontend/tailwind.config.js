/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        amazon: {
          navy: '#131921',
          dark: '#232f3e',
          orange: '#ff9900',
          'orange-dark': '#e88b00',
          yellow: '#febd69',
          blue: '#007185',
          'blue-hover': '#c7511f',
          light: '#f3f3f3',
          green: '#067d62'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: []
};

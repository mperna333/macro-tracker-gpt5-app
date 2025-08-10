/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        purple1: '#9E72C3',
        purple2: '#924DBF',
        purple3: '#7338A0',
        purple4: '#4A2574',
        purple5: '#0F0529',
      }
    }
  },
  plugins: [],
};

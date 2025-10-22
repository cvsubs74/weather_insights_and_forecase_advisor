/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Alert severity colors
        extreme: '#DC2626',
        severe: '#EA580C',
        moderate: '#F59E0B',
        minor: '#3B82F6',
        safe: '#10B981',
        // UI colors
        primary: '#1E40AF',
        secondary: '#6366F1',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

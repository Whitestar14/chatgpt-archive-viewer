/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
    "./public/index.html",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        serif: ["'Source Serif 4'", 'Charter', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Söhne Mono', 'Monaco', 'Andale Mono', 'Ubuntu Mono', 'monospace']
      },
      colors: {
        claude: {
          bg: '#FFFFFF',
          sidebar: '#F9F9F9',
          border: '#E5E5E5',
          user: '#F0EEE6',
          text: '#333333',
          accent: '#DA7756',
          dark: {
            bg: '#21201C',
            sidebar: '#1A1917',
            border: '#2C2B28',
            user: '#2F2E2B',
            text: '#E6E4DD',
            secondary: '#9D9B97'
          }
        }
      }
    }
  },
  plugins: [],
}


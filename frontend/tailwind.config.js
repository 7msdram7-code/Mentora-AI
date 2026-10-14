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
          bg: "#0F1226",
          card: "#171B36",
          cardHover: "#1E2347",
          border: "#292E56"
        },
        violet: {
          DEFAULT: "#6C4CF1",
          hover: "#5939D8",
          light: "#876DFF"
        },
        mastered: {
          green: "#1FB57A",
          bg: "rgba(31, 181, 122, 0.15)"
        },
        symptom: {
          amber: "#F5A524",
          bg: "rgba(245, 165, 36, 0.15)"
        },
        rootcause: {
          red: "#D93636",
          bg: "rgba(217, 54, 54, 0.15)"
        },
        cyan: {
          accent: "#22C3E6",
          bg: "rgba(34, 195, 230, 0.15)"
        },
        light: {
          panel: "#F1F0FF",
          subtle: "#A5A6C2"
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

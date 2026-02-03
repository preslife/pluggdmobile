/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "primary": "#FF5200",
        "background-light": "#FFFFFF",
        "background-dark": "#000000",
        "card-dark": "#121212",
        "text-secondary": "#9da4b9",
      },
      fontFamily: {
        "display": ["Spline Sans", "sans-serif"]
      }
    },
  },
  plugins: [],
}


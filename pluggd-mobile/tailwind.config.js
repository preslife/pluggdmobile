/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#FF5A00",
        "background-light": "#FFFFFF",
        "background-dark": "#000000",
        "card-dark": "#121212",
        "surface-dark": "#0B0B0D",
        "surface-light": "#F7F8FA",
        "text-secondary": "#9da4b9",
        "border-dark": "#1F1F25"
      },
      fontFamily: {
        "display": ["Spline Sans", "sans-serif"]
      }
    },
  },
  plugins: [],
}

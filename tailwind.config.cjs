module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#10b981", // Emerald green (Fresh/Kitchen feel)
        surface: "#f9fafb", // Off-white background
        card: "#ffffff",    // Pure white for bento tiles
        accent: "#1f2937",  // Deep charcoal for text
      },
    },
  },
  plugins: [],
}
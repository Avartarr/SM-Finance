import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#05070c",
        navy: "#071a33",
        ice: "#dbeafe",
        blueglass: "#7ea7ff",
        rose: "#b8c7e6",
        brass: "#d6b76a",
      },
      boxShadow: {
        glow: "0 24px 80px rgba(30, 64, 175, 0.28)",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        parchment: { 50: "#fbf7ee", 100: "#f4ecd8", 200: "#e9dcbb", 300: "#d9c493" },
        bark: { 500: "#6b4423", 700: "#4a2e17", 900: "#2b1a0c" },
        gilt: { 400: "#d8b25a", 500: "#c39a3c", 600: "#9c7a2a" },
        leaf: { 500: "#4f7d3a", 700: "#2f5a26" },
      },
      fontFamily: {
        naskh: ["Amiri", "Noto Naskh Arabic", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;

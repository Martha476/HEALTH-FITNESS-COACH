import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#22C55E",
        secondary: "#16A34A",
        accent: "#F9FAFB",
        dark: "#111827",
        fitness: {
          green: "#22C55E",
          "green-dark": "#16A34A",
          "green-light": "#4ADE80",
          white: "#F9FAFB",
          dark: "#111827",
        },
      },
    },
  },
  plugins: [],
};
export default config;

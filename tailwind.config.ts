import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          base: "#0A0A0A",
          surface: "#121212",
          border: "#1F1F1F",
        },
        accent: {
          green: "#00FF41", // Matrix Green
          blue: "#00F0FF", // Cyber Blue
        },
      },
      fontFamily: {
        mono: ["var(--font-jetbrains-mono)"],
      },
    },
  },
  plugins: [],
};
export default config;

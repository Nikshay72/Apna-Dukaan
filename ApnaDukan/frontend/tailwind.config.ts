import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components.tsx", "./screens.tsx", "./lib.ts"],
  theme: {
    extend: {
      colors: {
        bg: "#050505",
        surface: "#111111",
        line: "rgba(255,255,255,0.08)",
        accent: "#7CFF8A",
        glow: "#7A3CFF",
        ink: "#F4F4F5",
      },
      fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};

export default config;

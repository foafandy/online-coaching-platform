import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070807",
          900: "#0B0C0B",
          850: "#101110",
          800: "#151715",
          750: "#1B1D1B",
          700: "#232623",
          600: "#2E322E",
        },
        accent: {
          DEFAULT: "#C2B098",
          400: "#D1C3B0",
          500: "#C2B098",
          600: "#A18D72",
          700: "#806D54",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "Impact",
          "Haettenschweiler",
          "Arial Narrow Bold",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 40px -12px rgba(194, 176, 152, 0.45)",
        card: "0 24px 60px -30px rgba(0, 0, 0, 0.9)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.4s ease both",
      },
    },
  },
  plugins: [],
};

export default config;

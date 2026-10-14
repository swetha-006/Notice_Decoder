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
        canvas: {
          DEFAULT: "#FAF9F5",
          subtle: "#F4F2EC",
          card: "#FFFFFF",
          muted: "#ECE9E0",
        },
        ink: {
          DEFAULT: "#18181B",
          secondary: "#52525B",
          muted: "#71717A",
          faint: "#A1A1AA",
        },
        border: {
          DEFAULT: "#E4E4E7",
          subtle: "#ECEAE4",
          strong: "#D4D4D8",
        },
        accent: {
          DEFAULT: "#0F172A",
          hover: "#1E293B",
          subtle: "#F1F5F9",
        },
        scam: {
          DEFAULT: "#DC2626",
          bg: "#FEF2F2",
          border: "#FCA5A5",
          text: "#991B1B",
          highlight: "#FECACA",
        },
        suspicious: {
          DEFAULT: "#D97706",
          bg: "#FFFBEB",
          border: "#FCD34D",
          text: "#92400E",
          highlight: "#FDE68A",
        },
        genuine: {
          DEFAULT: "#16A34A",
          bg: "#F0FDF4",
          border: "#86EFAC",
          text: "#166534",
          highlight: "#BBF7D0",
        },
      },
      fontFamily: {
        serif: ["Newsreader", "Merriweather", "Georgia", "serif"],
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Noto Sans Tamil",
          "Noto Sans Devanagari",
          "sans-serif",
        ],
        indic: ["Noto Sans Tamil", "Noto Sans Devanagari", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

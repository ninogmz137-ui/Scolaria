/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ─── Core palette ─────────────────────────────────
        primary: {
          DEFAULT: "#6366F1",
          light: "#818CF8",
          dark: "#4F46E5",
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
        },
        background: {
          DEFAULT: "#F7F8FC",
          dark: "#0B0F2A",
        },
        card: {
          DEFAULT: "#FFFFFF",
          dark: "#1A1F3D",
          border: "#E2E8F0",
          "border-dark": "#2A2F4D",
        },
        foreground: {
          DEFAULT: "#0F172A",
          secondary: "#64748B",
          muted: "#94A3B8",
          inverse: "#FFFFFF",
        },
        "accent-ocean": {
          DEFAULT: "#4A90D9",
          light: "#93C5FD",
          dark: "#2563EB",
        },

        // ─── Status colors ────────────────────────────────
        success: { DEFAULT: "#22C55E", light: "#BBF7D0" },
        warning: { DEFAULT: "#FBBF24", light: "#FEF3C7" },
        danger:  { DEFAULT: "#EF4444", light: "#FECACA" },
        info:    { DEFAULT: "#0EA5E9", light: "#BAE6FD" },

        // ─── Existing dark theme ──────────────────────────
        "blue-night":      "#0B0F2A",
        "blue-night-light": "#131836",
        "blue-night-card":  "#1A1F3D",

        // ─── Child theme accents (for reference) ──────────
        ocean:   "#4A90D9",
        glacier: "#0EA5E9",
        ambre:   "#FBBF24",
        corail:  "#EF4444",
        rose:    "#EC4899",
        teal:    "#14B8A6",
        lavande: "#A78BFA",
        foret:   "#4CAF50",
        violet:  "#7C3AED",

        // ─── Teacher accent ───────────────────────────────
        "teacher-orange": "#FF6B35",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      fontFamily: {
        heading: ["System"],
        body: ["System"],
      },
    },
  },
  plugins: [],
};

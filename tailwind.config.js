/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-jakarta)", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Extended Berri palette - Sunset Suite (warm & premium)
        berri: {
          // Primary warm colors
          primary: "#E54868",      // Raspberry - main brand color
          warm: "#FF7F6B",         // Coral - warm accent
          // Legacy aliases
          raspberry: "#E54868",
          coral: "#FF7F6B",
          // Tertiary warm accent (replacing green/lime)
          amber: "#F5A623",        // Warm tertiary accent
          gold: "#D4940A",         // Deeper amber for hover/active
          // Premium neutrals
          charcoal: "#1A1A2E",     // Dark sections, Enterprise tier
          warmWhite: "#FAF8F5",    // Warm white background
          // Supporting colors
          light: "#FFF0F3",        // Warm light background
          lightAccent: "#FFF8E7",  // Warm light for amber accents
          // Semantic colors (kept for functional use only)
          green: "#4CAF50",        // Success states only
          red: "#E53935",          // Error states only
          // Legacy colors - FULLY DEPRECATED (kept for backwards compatibility only)
          // Use warm brand palette (Raspberry, Coral, Amber) instead
          dark: "#0a0a0f",
          darker: "#050508",
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "float": "float 3s ease-in-out infinite",
        "spin-slow": "spin 20s linear infinite",
        "spin-slower": "spin 30s linear infinite",
        "pulse-slow": "pulse 4s ease-in-out infinite",
        "gradient": "gradient-rotate 4s ease infinite",
        "glow": "glow-pulse 3s ease-in-out infinite",
        "marquee": "marquee 30s linear infinite",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "gradient-rotate": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        "marquee": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(calc(-100% - 3rem))" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "aurora": "radial-gradient(ellipse 80% 80% at 50% -20%, rgba(245, 166, 35, 0.3), transparent), radial-gradient(ellipse 50% 50% at 80% 50%, rgba(255, 127, 107, 0.2), transparent), radial-gradient(ellipse 60% 60% at 20% 80%, rgba(229, 72, 104, 0.2), transparent)",
      },
      boxShadow: {
        // Primary glows - warm raspberry
        "glow-sm": "0 0 20px rgba(229, 72, 104, 0.15)",
        "glow": "0 0 40px rgba(229, 72, 104, 0.2)",
        "glow-lg": "0 0 60px rgba(229, 72, 104, 0.3)",
        // Accent glows - warm amber
        "glow-accent": "0 0 40px rgba(245, 166, 35, 0.2)",
        "glow-amber": "0 0 40px rgba(245, 166, 35, 0.2)",
        "glow-gold": "0 0 40px rgba(212, 148, 10, 0.2)",
        // Coral warm glow
        "glow-coral": "0 0 40px rgba(255, 127, 107, 0.2)",
        "glow-raspberry": "0 0 40px rgba(229, 72, 104, 0.2)",
        "inner-glow": "inset 0 0 40px rgba(255, 255, 255, 0.04)",
        // Softer shadows for cards
        "soft": "0 4px 20px rgba(0, 0, 0, 0.05)",
        "soft-lg": "0 8px 30px rgba(0, 0, 0, 0.07)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("tailwindcss-animate")],
}

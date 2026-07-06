import type { Config } from "tailwindcss"
import plugin from "tailwindcss/plugin"

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "'Segoe UI'", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-sans)", "'Segoe UI'", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        background: "oklch(var(--background))",
        foreground: "oklch(var(--foreground))",
        card: {
          DEFAULT: "oklch(var(--card))",
          foreground: "oklch(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "oklch(var(--popover))",
          foreground: "oklch(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "oklch(var(--primary))",
          foreground: "oklch(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary))",
          foreground: "oklch(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "oklch(var(--muted))",
          foreground: "oklch(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "oklch(var(--accent))",
          foreground: "oklch(var(--accent-foreground))",
        },
        destructive: { DEFAULT: "oklch(var(--destructive))" },
        border: "oklch(var(--border))",
        input: "oklch(var(--input))",
        ring: "oklch(var(--ring))",
        sidebar: {
          DEFAULT: "oklch(var(--sidebar))",
          foreground: "oklch(var(--sidebar-foreground))",
          primary: "oklch(var(--sidebar-primary))",
          "primary-foreground": "oklch(var(--sidebar-primary-foreground))",
          accent: "oklch(var(--sidebar-accent))",
          "accent-foreground": "oklch(var(--sidebar-accent-foreground))",
          border: "oklch(var(--sidebar-border))",
          ring: "oklch(var(--sidebar-ring))",
        },
        brewhas: {
          50: "#f5f0f7",
          100: "#e8dcef",
          200: "#d1b9df",
          300: "#b28bc8",
          400: "#9464ad",
          500: "#7b4693",
          600: "#6a3879",
          700: "#4A235A",
          800: "#3d1c4c",
          900: "#2d1538",
        },
        gold: {
          50: "#fdfbf5",
          100: "#faf3d8",
          200: "#f5e6b0",
          300: "#efd57f",
          400: "#e8c24e",
          500: "#D4AF37",
          600: "#b89324",
          700: "#8a6e1b",
          800: "#5c4912",
          900: "#3d300c",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        "slide-up": {
          from: { transform: "translateY(100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "gold-shimmer": {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "gold-pulse": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(212, 175, 55, 0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(212, 175, 55, 0.6)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "gold-shimmer": "gold-shimmer 3s linear infinite",
        "gold-pulse": "gold-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [
    plugin(function ({ addVariant }) {
      addVariant("data-open", '&:where([data-state="open"], [data-open]:not([data-open="false"]))')
      addVariant("data-closed", '&:where([data-state="closed"], [data-closed]:not([data-closed="false"]))')
      addVariant("data-checked", '&:where([data-state="checked"], [data-checked]:not([data-checked="false"]))')
      addVariant("data-unchecked", '&:where([data-state="unchecked"], [data-unchecked]:not([data-unchecked="false"]))')
      addVariant("data-selected", '&:where([data-selected="true"])')
      addVariant("data-disabled", '&:where([data-disabled="true"], [data-disabled]:not([data-disabled="false"]))')
      addVariant("data-active", '&:where([data-state="active"], [data-active]:not([data-active="false"]))')
    }),
  ],
}
export default config

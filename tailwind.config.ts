import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jakarta)', 'Arial', 'Helvetica', 'sans-serif'],
      },
      colors: {
        brand: {
          dark: "#163A32",
          primary: "#2F6F57",
          hover: "#255A47",
          secondary: "#6FA58A",
          accent: "#1FA7C9",
          soft: "#EEF4F1",
          border: "#D9E3DE",
          bg: "#F5F8F6",
        },
      },
    },
  },
  plugins: [],
};
export default config;


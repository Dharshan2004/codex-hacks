import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        shopee: {
          DEFAULT: "#ee4d2d",
          dark: "#d73211",
          light: "#fef0ec",
        },
      },
    },
  },
  plugins: [],
};

export default config;

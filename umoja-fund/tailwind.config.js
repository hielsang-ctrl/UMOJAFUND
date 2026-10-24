/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: { accent: { DEFAULT: "#EF6A3C", soft: "#f6b9a3" } },
    },
  },
  plugins: [],
};

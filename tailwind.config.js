/** @type {import('tailwindcss').Config} */
// NativeWind 4 + Tailwind v3. The "Clay" design-system palette (warm-dark theme, Section 4 of
// PLAN-rev2) is mapped into theme.extend in a later milestone (M1 tokens); basic setup for now.
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};

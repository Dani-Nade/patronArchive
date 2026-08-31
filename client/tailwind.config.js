/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      /*
       * "Ritual Press" — the Deadlock-native design system.
       * Palette sampled from the official Old Gods, New Blood page:
       * warm charcoal grounds, parchment cream text, marigold primary,
       * vermillion ribbons. Teal is kept from the old theme as the
       * secondary accent — it matches the game's spirit glow.
       */
      colors: {
        // Warm ink-and-paper ramp. Overrides Tailwind's cool neutral so the
        // entire app warms without touching every className.
        neutral: {
          50:  '#f7f2e7',
          100: '#ece5d6',
          200: '#ddd3bd',
          300: '#c1b6a0',
          400: '#a89d88',
          500: '#857b68',
          600: '#645c4d',
          700: '#453f35',
          800: '#2c2822',
          900: '#1d1a16',
          950: '#14110d',
        },
        // Marigold — the Hidden King field. Primary actions and brand mark.
        amber: {
          100: '#ffedc7',
          200: '#ffdd94',
          300: '#ffc95c',
          400: '#f7ac2e',
          500: '#e89416',
          600: '#c67a10',
          700: '#9c5f0d',
          800: '#7a4a0e',
          900: '#52320c',
          950: '#271905',
        },
        // Vermillion — the "Street Brawl" ribbon. Section labels, hot moments.
        ember: {
          100: '#ffe0d1',
          200: '#ffc0a4',
          300: '#ff9a72',
          400: '#f0703f',
          500: '#e25e31',
          600: '#c44a24',
          700: '#9c3a1e',
          800: '#732c19',
          900: '#4a1e12',
          950: '#2a1009',
        },
      },
      fontFamily: {
        display: ['"Alfa Slab One"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-amber': '0 0 28px rgba(247, 172, 46, 0.18)',
        'glow-teal': '0 0 28px rgba(45, 212, 191, 0.15)',
        'card': '0 2px 12px rgba(0, 0, 0, 0.4)',
        // Hard offset shadows — the screen-print look from the official page.
        'press': '5px 5px 0 0 rgba(0, 0, 0, 0.55)',
        'press-sm': '3px 3px 0 0 rgba(0, 0, 0, 0.55)',
        'press-amber': '5px 5px 0 0 rgba(247, 172, 46, 0.85)',
      },
      keyframes: {
        marquee: { to: { transform: 'translateX(-50%)' } },
      },
      animation: {
        marquee: 'marquee 36s linear infinite',
      },
    },
  },
  plugins: [],
};

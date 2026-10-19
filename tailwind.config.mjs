/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lato', 'system-ui', 'sans-serif'],
        display: ['Lato', 'system-ui', 'sans-serif'],
        body: ['Lato', 'system-ui', 'sans-serif'],
        mono: ['Lato', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Light neutrals: a cool paper that sits next to the footer's misty sky.
        sand: {
          50: '#f5f6f8',
          100: '#eceff2',
          200: '#dde3e9',
          300: '#c5d0d8',
          400: '#9fb0be',
          500: '#7d8fa0',
          600: '#5f7182',
          700: '#475666',
          800: '#33404d',
          900: '#222c36',
          950: '#141b22',
        },
        // Ink: the footer's night navy. Text in light mode, ground in dark mode.
        ink: {
          50: '#f4f6f9',
          100: '#e4e9ef',
          200: '#c9d2dc',
          300: '#9aa7b6',
          400: '#7a8799',
          500: '#5b6878',
          600: '#465364',
          700: '#354152',
          800: '#222c3a',
          900: '#121a24',
          950: '#0b1016',
        },
        // Lava: the glowing ridge. The one accent colour.
        lava: {
          50: '#fff1f3',
          100: '#ffe1e7',
          200: '#ffc4cf',
          300: '#ff8fa3',
          400: '#ff6b86',
          500: '#ef3b62',
          600: '#c92a4f',
          700: '#a8213f',
          800: '#7f1931',
          900: '#561022',
        },
        // Amber: the hottest part of the glow and the lake's sunrise. Highlights only.
        amber: {
          300: '#ffd27a',
          400: '#ffb53d',
          500: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
};

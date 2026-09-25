/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: {
        sm: '640px',
        md: '768px',
        nav: '920px', // full nav row fits from here up (compact spacing below lg)
        lg: '1024px',
        xl: '1280px',
      },
      colors: {
        // Palette is mirrored from CSS variables in src/index.css — keep both in sync.
        'bg-primary': '#FDE3CD',
        'bg-secondary': '#FFFFFF',
        'bg-alt': '#FFFFFF',
        ink: '#1B1815',
        'ink-soft': '#5C554C',
        accent: '#7A0000', // deep muted maroon — SALE tags, hover underline, sale badges only
        graphite: '#3A3A3A', // alternate neutral accent, kept defined for easy swap
        'line-soft': '#C9C1B4',
      },
      fontFamily: {
        // Wordmark font — swap here (and in index.css) when the final logo font arrives.
        wordmark: ['Anton', 'Archivo Black', 'Impact', 'sans-serif'],
        body: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        shell: '80rem',
      },
    },
  },
  plugins: [],
}

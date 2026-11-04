/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: 'var(--bg)', card: 'var(--card)', ink: 'var(--ink)', mute: 'var(--mute)', line: 'var(--line)',
        field: 'var(--field)', key: 'var(--key)', brand: 'var(--brand)', brand2: 'var(--brand2)',
        err: 'var(--err)', ok: 'var(--ok)',
      },
    },
  },
  plugins: [],
};

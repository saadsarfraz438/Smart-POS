import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const initial = (): Theme => {
  try { const s = localStorage.getItem('volta_theme'); if (s === 'dark' || s === 'light') return s; } catch { /* ignore */ }
  return matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initial);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('volta_theme', theme); } catch { /* ignore */ }
  }, [theme]);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button type="button" onClick={() => setTheme(next)} aria-label={`Switch to ${next} mode`}
      className="absolute top-4 right-4 min-h-[48px] px-5 rounded-3xl border border-line bg-card text-ink font-semibold">
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}

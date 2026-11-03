import { useEffect, useState } from 'react';

/* ---------- Brute-force lockout (NFR-2.2): 5 fails -> 5 min lock ---------- */
const LOCK_KEY = 'volta_lock';
export const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;

const read = () => {
  try {
    return JSON.parse(window.localStorage.getItem(LOCK_KEY)) || { fails: 0, until: 0 };
  } catch {
    return { fails: 0, until: 0 };
  }
};
const write = (v) => {
  try {
    window.localStorage.setItem(LOCK_KEY, JSON.stringify(v));
  } catch {
    /* storage blocked */
  }
};

export function getLock() {
  const s = read();
  if (s.until && Date.now() >= s.until) {
    write({ fails: 0, until: 0 });
    return { fails: 0, until: 0 };
  }
  return s;
}
export function registerFailure() {
  const s = getLock();
  s.fails += 1;
  if (s.fails >= MAX_ATTEMPTS) s.until = Date.now() + LOCK_MS;
  write(s);
  return { ...s, left: Math.max(0, MAX_ATTEMPTS - s.fails) };
}
export const clearFailures = () => write({ fails: 0, until: 0 });
export const attemptsLeft = () => Math.max(0, MAX_ATTEMPTS - getLock().fails);

/* ---------- Input sanitising (FR-2.1) ---------- */
export const cleanText = (v, max = 128) =>
  String(v).replace(/[\u0000-\u001f\u007f<>]/g, '').slice(0, max);
export const cleanDigits = (v, max = 6) => String(v).replace(/\D/g, '').slice(0, max);
export const validPin = (v) => /^\d{4,6}$/.test(v);

/* ---------- Light / dark theme ---------- */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = window.localStorage.getItem('volta_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      /* ignore */
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  useEffect(() => {
    try {
      window.localStorage.setItem('volta_theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}

/* ---------- Auto-lock after inactivity (NFR-2.3) ----------
   Use inside the POS register layout:
   useIdleLock(useCallback(() => { clearSession(); navigate('/login'); }, [navigate])); */
export function useIdleLock(onLock, ms = 15 * 60 * 1000) {
  useEffect(() => {
    let timer = setTimeout(onLock, ms);
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(onLock, ms);
    };
    const events = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [onLock, ms]);
}

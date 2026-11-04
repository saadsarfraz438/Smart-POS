/* Sanitising + validation (FR-2) */
export const cleanText = (v: string, max = 128) => v.replace(/[\u0000-\u001f\u007f<>]/g, '').slice(0, max);
export const cleanDigits = (v: string, max = 6) => v.replace(/\D/g, '').slice(0, max);
export const validPin = (v: string) => /^\d{4,6}$/.test(v);
export const validTenantCode = (v: string) => /^[A-Za-z0-9][A-Za-z0-9-]{2,29}$/.test(v); // TRD-8821 or a sub-domain label

/* Client-side lockout: 5 fails -> 5 min. UX only; the API must enforce its own limit. */
const KEY = 'volta_lock';
export const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;
type Lock = { fails: number; until: number };

const read = (): Lock => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '') ?? { fails: 0, until: 0 }; } catch { return { fails: 0, until: 0 }; }
};
const write = (v: Lock) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage blocked */ } };

export function getLock(): Lock {
  const s = read();
  if (s.until && Date.now() >= s.until) { write({ fails: 0, until: 0 }); return { fails: 0, until: 0 }; }
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

import { useCallback, useEffect, useRef, useState } from 'react';

/** PIN buffer for the touch numpad. Also accepts a physical keyboard. Auto-submits when `max` digits are entered. */
export function useNumpad(max = 6, enabled = true, onComplete?: (pin: string) => void) {
  const [value, setValue] = useState('');
  const done = useRef(onComplete);
  done.current = onComplete;

  const press = useCallback((k: string) => {
    setValue((v) => (k === 'C' ? '' : k === '⌫' ? v.slice(0, -1) : (v + k).slice(0, max)));
  }, [max]);
  const reset = useCallback(() => setValue(''), []);

  useEffect(() => { if (value.length === max) done.current?.(value); }, [value, max]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t instanceof HTMLInputElement && t.type !== 'password') return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('⌫');
      else if (e.key === 'Escape') press('C');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, press]);

  return { value, press, reset };
}

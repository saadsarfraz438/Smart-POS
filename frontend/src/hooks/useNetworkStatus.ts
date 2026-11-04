import { useEffect, useState } from 'react';
import { API_URL, ENDPOINTS, POLL_MS } from '../utils/constants';

/** navigator.onLine + a 30 s health ping (NFR-3.2). A timeout counts as offline (FR-3.1). */
export function useNetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    let stop = false;
    const ping = async () => {
      if (!navigator.onLine) { setOnline(false); setLatency(null); return; }
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 4000);
      const start = performance.now();
      try {
        await fetch(API_URL + ENDPOINTS.health, { cache: 'no-store', signal: ctl.signal });
        if (!stop) { setOnline(true); setLatency(Math.round(performance.now() - start)); }
      } catch { if (!stop) { setOnline(false); setLatency(null); } }
      finally { clearTimeout(t); }
    };
    const up = () => { void ping(); };
    const down = () => { setOnline(false); setLatency(null); };
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    void ping();
    const id = setInterval(ping, POLL_MS);
    return () => { stop = true; clearInterval(id); window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  return { online, latency };
}

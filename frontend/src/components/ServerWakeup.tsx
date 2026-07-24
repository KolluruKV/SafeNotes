import { useState, useEffect, useRef } from 'react';

const HEALTH_URL = (import.meta.env.VITE_API_URL || '/api') + '/health';
const SLOW_THRESHOLD_MS = 2500; // show overlay if backend hasn't responded in 2.5s
const POLL_INTERVAL_MS = 3000;

interface Props {
  children: React.ReactNode;
}

export default function ServerWakeup({ children }: Props) {
  const [awake, setAwake] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [dots, setDots] = useState('');
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const ping = async (): Promise<boolean> => {
    try {
      const res = await fetch(HEALTH_URL, { method: 'GET', cache: 'no-store' });
      return res.ok;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      // Start slow-backend timer
      slowTimer.current = setTimeout(() => {
        if (!cancelled) setShowOverlay(true);
      }, SLOW_THRESHOLD_MS);

      // First ping
      const ok = await ping();
      if (!cancelled && ok) {
        clearTimeout(slowTimer.current!);
        setAwake(true);
        return;
      }

      // Poll until awake
      pollTimer.current = setInterval(async () => {
        const alive = await ping();
        if (!cancelled && alive) {
          clearInterval(pollTimer.current!);
          setAwake(true);
          setShowOverlay(false);
        }
      }, POLL_INTERVAL_MS);
    };

    start();

    return () => {
      cancelled = true;
      if (slowTimer.current) clearTimeout(slowTimer.current);
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  // Animate dots
  useEffect(() => {
    if (!showOverlay) return;
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 500);
    return () => clearInterval(id);
  }, [showOverlay]);

  if (showOverlay && !awake) {
    return (
      <div className="wakeup-overlay">
        <div className="wakeup-card">
          <div className="wakeup-spinner" />
          <h2 className="wakeup-title">SafeNotes</h2>
          <p className="wakeup-msg">Connecting to server{dots}</p>
          <p className="wakeup-sub">The server is starting up, this takes ~30 seconds on first load.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

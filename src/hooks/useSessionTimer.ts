import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Session timer for adult supervision.
 * Uses Date.now() difference (drift-immune, doesn't prevent tab sleep).
 * Refreshes display every 10s (not 1s — precision unnecessary for a supervision indicator).
 */
export function useSessionTimer(enabled: boolean, alertMinutes: number) {
  const startTime = useRef(Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [alerted, setAlerted] = useState(false);

  // Reset timer when re-enabled
  useEffect(() => {
    if (enabled) {
      startTime.current = Date.now();
      setElapsedMs(0);
      setAlerted(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime.current);
    }, 10_000); // refresh every 10s
    return () => clearInterval(interval);
  }, [enabled]);

  // Alert check
  useEffect(() => {
    if (enabled && !alerted && elapsedMs >= alertMinutes * 60 * 1000) {
      setAlerted(true);
    }
  }, [elapsedMs, alertMinutes, enabled, alerted]);

  const reset = useCallback(() => {
    startTime.current = Date.now();
    setElapsedMs(0);
    setAlerted(false);
  }, []);

  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return { elapsedMs, formatted, alerted, reset };
}

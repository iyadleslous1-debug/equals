import { useCallback, useRef, useState } from 'react';

/**
 * Single in-flight async action. Concurrent calls while busy resolve null
 * (ignored, not queued). Used by deck + request buttons as the UX frontstop;
 * server constraints (UNIQUE pairs, state-machine trigger) are the backstop.
 */
export function useAct(): { acting: boolean; run: <T>(fn: () => Promise<T>) => Promise<T | null> } {
  const [acting, setActing] = useState(false);
  const busy = useRef(false);

  const run = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    if (busy.current) return null;
    busy.current = true;
    setActing(true);
    try {
      return await fn();
    } finally {
      busy.current = false;
      setActing(false);
    }
  }, []);

  return { acting, run };
}

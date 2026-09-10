import { useCallback, useEffect, useRef } from 'react';
import { recordLogin, touchActivity } from '../lib/activity';
import { useForegroundRefetch } from './useForegroundRefetch';

const HEARTBEAT_MS = 5 * 60_000;

/**
 * Retention wiring: claim today's login once per user per UTC day, heartbeat
 * on foreground returns (client-throttled; the server enforces the same
 * window). Mount once at the app root; pass the signed-in user id or null.
 */
export function useActivity(userId: string | null | undefined): void {
  const enabled = userId !== null && userId !== undefined;
  const claimedFor = useRef<string | null>(null);
  const lastTouch = useRef(0);

  useEffect(() => {
    if (!enabled || userId === null || userId === undefined) return;
    const today = new Date().toISOString().slice(0, 10);
    const stamp = `${userId}|${today}`;
    if (claimedFor.current === stamp) return;
    claimedFor.current = stamp;
    void recordLogin();
  }, [enabled, userId]);

  useForegroundRefetch(
    useCallback(() => {
      if (!enabled) return;
      const now = Date.now();
      if (now - lastTouch.current < HEARTBEAT_MS) return;
      lastTouch.current = now;
      void touchActivity();
    }, [enabled]),
  );
}

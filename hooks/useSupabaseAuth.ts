/**
 * Mirrors Supabase Auth state into the Zustand session store.
 * Mount once at the app root (see `app/_layout.tsx`).
 */
import { useEffect } from 'react';
import { getSession } from '../lib/auth';
import { createLogger } from '../lib/logger';
import { supabase } from '../lib/supabase';
import { useSessionStore } from '../store/sessionStore';

const log = createLogger('useSupabaseAuth');

export function useSupabaseAuth(): void {
  const setSession = useSessionStore((s) => s.setSession);

  useEffect(() => {
    let mounted = true;
    getSession()
      .then((session) => {
        if (mounted) setSession(session);
      })
      .catch((error: unknown) => log.error('Initial session read failed.', { error }));

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setSession(session);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [setSession]);
}

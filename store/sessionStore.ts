/**
 * Global client state (Zustand) — auth session mirror.
 *
 * Rule: Zustand holds *client* state (session, UI prefs). Server data lives in
 * React Query (`lib/query-client.ts`). Feature stores live in
 * `features/<name>/store.ts` and follow this file's shape.
 */
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

export type SessionStatus = 'loading' | 'authed' | 'guest';

interface SessionState {
  session: Session | null;
  status: SessionStatus;
  setSession: (session: Session | null) => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  session: null,
  status: 'loading',
  setSession: (session) => set({ session, status: session === null ? 'guest' : 'authed' }),
}));

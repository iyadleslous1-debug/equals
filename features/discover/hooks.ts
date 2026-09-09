import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LIST_STALE_TIME_MS } from '@/constants/app';
import { useAct } from '@/hooks/useAct';
import { reportError } from '@/lib/reporting';
import { useSignedUrls } from '@/hooks/useSignedUrls';
import { fetchDeck, sendRequest, skipProfile, type DeckProfile } from './api';

export const DECK_KEY = ['deck'] as const;

export function useDeck() {
  return useQuery({ queryKey: DECK_KEY, queryFn: () => fetchDeck(), staleTime: LIST_STALE_TIME_MS });
}

/** Signed display URLs for deck card photos (bucket paths stay private). */
export function useCardPhotoUrls(profiles: DeckProfile[]): Record<string, string> {
  return useSignedUrls(
    'deck-photo-url',
    profiles,
    (profile) => profile.user_id,
    (profile) => profile.card_photo_url,
  ).urls;
}

/**
 * Single in-flight action across all deck buttons — shared implementation
 * lives in `@/hooks/useAct` (re-exported here so existing imports keep
 * working; new code imports from `@/hooks/useAct` directly).
 */
export { useAct } from '@/hooks/useAct';

export function useDeckActions(onDone: (targetUserId: string) => void): {
  acting: boolean;
  request: (targetUserId: string) => void;
  skip: (targetUserId: string) => void;
  error: string | null;
} {
  const [error, setError] = useState<string | null>(null);
  const { acting, run } = useAct();

  // Advance past the card ONLY on success or idempotent already-recorded.
  // On real failures the card stays mounted with its error + retry — the
  // swipe row may already exist server-side, but the deck still shows the
  // target until the user moves on, so nothing is silently orphaned.
  // No per-action refetch: the deck order is stable client-side; refresh
  // happens on empty, explicit refresh, and foreground return.
  const settle = useCallback(
    async (
      targetUserId: string,
      work: Promise<{ ok: boolean; error?: { code?: string; message?: string } }>,
    ) => {
      try {
        const result = await work;
        const benign = result.ok || result.error?.code === 'discover/already-recorded';
        if (!benign) {
          setError(result.error?.message ?? 'Something went wrong. Try again.');
          return;
        }
      } catch (error) {
        reportError(error, { where: 'discover/settle' });
        setError('Something went wrong. Try again.');
        return;
      }
      setError(null);
      onDone(targetUserId);
    },
    [onDone],
  );

  const request = useCallback(
    (targetUserId: string) => {
      setError(null);
      void run(() => settle(targetUserId, sendRequest(targetUserId)));
    },
    [run, settle],
  );

  const skip = useCallback(
    (targetUserId: string) => {
      setError(null);
      void run(() => settle(targetUserId, skipProfile(targetUserId)));
    },
    [run, settle],
  );

  return { acting, request, skip, error };
}

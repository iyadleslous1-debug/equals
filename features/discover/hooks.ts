import { useCallback, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { LIST_STALE_TIME_MS } from '@/constants/app';
import { useAct } from '@/hooks/useAct';
import { resolveStorageUrl } from '@/lib/storage-url';
import { fetchDeck, sendRequest, skipProfile, type DeckProfile } from './api';

export const DECK_KEY = ['deck'] as const;

/** Signed-URL cache window — comfortably inside the 1h URL TTL. */
const PHOTO_URL_STALE_MS = 30 * 60_000;

export function useDeck() {
  return useQuery({ queryKey: DECK_KEY, queryFn: () => fetchDeck(), staleTime: LIST_STALE_TIME_MS });
}

/** Signed display URLs for deck card photos (bucket paths stay private). */
export function useCardPhotoUrls(profiles: DeckProfile[]): Record<string, string> {
  const results = useQueries({
    queries: profiles.map((profile) => ({
      queryKey: ['deck-photo-url', profile.user_id, profile.card_photo_url],
      queryFn: () =>
        profile.card_photo_url === null
          ? Promise.resolve(null)
          : resolveStorageUrl('profile-photos', profile.card_photo_url),
      staleTime: PHOTO_URL_STALE_MS,
    })),
  });
  const urls: Record<string, string> = {};
  profiles.forEach((profile, index) => {
    const data = results[index]?.data;
    if (data?.ok) urls[profile.user_id] = data.data;
  });
  return urls;
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
      const result = await work;
      const benign = result.ok || result.error?.code === 'discover/already-recorded';
      if (!benign) {
        setError(result.error?.message ?? 'Action impossible. Réessayez.');
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

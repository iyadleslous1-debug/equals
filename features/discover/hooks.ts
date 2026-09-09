import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LIST_STALE_TIME_MS } from '@/constants/app';
import { useAct } from '@/hooks/useAct';
import { reportError } from '@/lib/reporting';
import { useSignedUrls } from '@/hooks/useSignedUrls';
import { deckFiltersSchema, parseWith, type DeckFilters } from '@/lib/validation/schemas';
import {
  fetchDeck,
  fetchCompatibility,
  fetchGallery,
  getMyFilters,
  saveFilters,
  sendRequest,
  skipProfile,
  type DeckProfile,
} from './api';

export const DECK_KEY = ['deck'] as const;
export const COMPAT_KEY = ['compat'] as const;
export const FILTERS_KEY = ['filters', 'mine'] as const;

export function useDeck(filters?: DeckFilters) {
  return useQuery({
    queryKey: [...DECK_KEY, JSON.stringify(filters ?? null)],
    queryFn: () => fetchDeck(20, filters),
    staleTime: LIST_STALE_TIME_MS,
    enabled: filters !== undefined,
  });
}

/** My persisted filter preferences (undefined until loaded). */
export function useFilters() {
  return useQuery({ queryKey: FILTERS_KEY, queryFn: () => getMyFilters(), staleTime: LIST_STALE_TIME_MS });
}

/** Validate → save → refresh deck. Invalid shapes never reach the API. */
export function useSaveFilters(): {
  save: (input: unknown) => void;
  reset: () => void;
  status: 'idle' | 'pending' | 'success' | 'error';
  error: string | null;
  fieldErrors: Record<string, string>;
} {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const client = useQueryClient();

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setFieldErrors({});
  }, []);

  const save = useCallback(
    (input: unknown) => {
      setStatus('pending');
      setError(null);
      setFieldErrors({});
      const parsed = parseWith(deckFiltersSchema, input);
      if (!parsed.ok) {
        const next: Record<string, string> = {};
        for (const issue of (parsed.error.details as { path: (string | number)[]; message: string }[]) ??
          []) {
          const key = String(issue.path[0] ?? 'form');
          if (next[key] === undefined) next[key] = issue.message;
        }
        setFieldErrors(next);
        setStatus('error');
        return;
      }
      void (async () => {
        try {
          const result = await saveFilters(parsed.data);
          if (!result.ok) {
            setError(result.error.message);
            setStatus('error');
            return;
          }
          setStatus('success');
          void client.invalidateQueries({ queryKey: FILTERS_KEY });
          void client.invalidateQueries({ queryKey: DECK_KEY });
        } catch (thrown) {
          reportError(thrown, { where: 'discover/filters-save' });
          setError('Something went wrong. Try again.');
          setStatus('error');
        }
      })();
    },
    [client],
  );

  return { save, reset, status, error, fieldErrors };
}

/**
 * Compatibility scores for deck user ids. Disabled (default deck order) when
 * the id list is empty — the screen passes [] unless the viewer's own survey
 * is completed, so survey-less viewers never pay for or see reordering.
 */
export function useCompatibility(userIds: string[]) {
  // Sorted copy: cache key must not fragment on benign server reorders.
  const key = [...userIds].sort().join(',');
  return useQuery({
    queryKey: [...COMPAT_KEY, key],
    queryFn: () => fetchCompatibility(userIds),
    staleTime: LIST_STALE_TIME_MS,
    enabled: userIds.length > 0,
  });
}

export const GALLERY_KEY = ['gallery'] as const;

/** Stranger gallery for one profile (empty = blocked/inactive/unavailable). */
export function useGallery(userId: string) {
  return useQuery({
    queryKey: [...GALLERY_KEY, userId],
    queryFn: () => fetchGallery(userId),
    staleTime: LIST_STALE_TIME_MS,
    enabled: userId !== '',
  });
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

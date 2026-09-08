import { useCallback, useState } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { LIST_STALE_TIME_MS } from '@/constants/app';
import { useAct } from '@/hooks/useAct';
import { resolveStorageUrl } from '@/lib/storage-url';
import { acceptRequest, declineRequest, fetchInbox, type InboxItem } from './api';

export const REQUESTS_KEY = ['requests'] as const;

export function useRequests() {
  return useQuery({ queryKey: REQUESTS_KEY, queryFn: fetchInbox, staleTime: LIST_STALE_TIME_MS });
}

/** Signed avatar URLs for inbox counterparts (null until resolved or failed). */
export function useInboxPhotoUrls(items: InboxItem[]): Record<string, string> {
  const results = useQueries({
    queries: items.map((item) => ({
      queryKey: ['inbox-photo-url', item.id, item.counterpart?.card_photo_url ?? 'none'],
      queryFn: () =>
        item.counterpart?.card_photo_url
          ? resolveStorageUrl('profile-photos', item.counterpart.card_photo_url)
          : Promise.resolve(null),
      staleTime: 30 * 60_000,
    })),
  });
  const urls: Record<string, string> = {};
  items.forEach((item, index) => {
    const data = results[index]?.data;
    if (data?.ok) urls[item.id] = data.data;
  });
  return urls;
}

export interface ActionNotice {
  id: number;
  text: string;
}

let noticeId = 0;

/**
 * Single model for in-flight state: while ANY respond action runs, `acting`
 * disables every card (no per-card tracking to stick). Success carries a
 * transient `notice` for toast feedback; failures surface `error` inline.
 */
export function useRespond(): {
  acting: boolean;
  accept: (requestId: string) => void;
  decline: (requestId: string) => void;
  error: string | null;
  notice: ActionNotice | null;
} {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<ActionNotice | null>(null);
  const { acting, run } = useAct();
  const client = useQueryClient();
  const refresh = useCallback(() => void client.invalidateQueries({ queryKey: REQUESTS_KEY }), [client]);

  const settle = useCallback(
    async (work: Promise<{ ok: boolean; error?: { message: string } }>, done: string) => {
      const result = await work;
      if (!result.ok) {
        setError(result.error?.message ?? 'Action impossible. Réessayez.');
        return;
      }
      setError(null);
      noticeId += 1;
      setNotice({ id: noticeId, text: done });
      refresh();
    },
    [refresh],
  );

  const accept = useCallback(
    (requestId: string) => {
      setError(null);
      void run(() => settle(acceptRequest(requestId), 'Demande acceptée.'));
    },
    [run, settle],
  );

  const decline = useCallback(
    (requestId: string) => {
      setError(null);
      void run(() => settle(declineRequest(requestId), 'Demande refusée.'));
    },
    [run, settle],
  );

  return { acting, accept, decline, error, notice };
}

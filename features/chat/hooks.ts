import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LIST_STALE_TIME_MS } from '@/constants/app';
import { reportError } from '@/lib/reporting';
import { supabase } from '@/lib/supabase';
import { useSignedUrls } from '@/hooks/useSignedUrls';
import { useForegroundRefetch } from '@/hooks/useForegroundRefetch';
import {
  fetchMessages,
  isConversationId,
  listConversations,
  markRead,
  sendMessage,
  MESSAGE_PAGE_SIZE,
  type ConversationPreview,
  type MessageRow,
} from './api';

export const CHAT_KEY = ['chat'] as const;

export function useConversations() {
  return useQuery({
    queryKey: [...CHAT_KEY, 'list'],
    queryFn: listConversations,
    staleTime: LIST_STALE_TIME_MS,
  });
}
/** Signed avatar URLs for conversation counterparts (null until resolved). */
export function usePreviewAvatars(previews: ConversationPreview[]): Record<string, string> {
  return useSignedUrls(
    'chat-avatar-url',
    previews,
    (preview) => preview.conversationId,
    (preview) => preview.otherCard,
  ).urls;
}
export interface OutboxMessage {
  localId: string;
  text: string;
  status: 'pending' | 'failed';
}

let localCounter = 0;

/**
 * Client-side outbox: queued text survives send failure for visible retry.
 * Server rows replace outbox entries on success (matched by order, newest
 * last); failed entries stay until retried or discarded. Never silently lost.
 */
export function useOutbox(): {
  queue: (text: string) => string;
  markSent: (localId: string) => void;
  markFailed: (localId: string) => void;
  retry: (localId: string) => void;
  discard: (localId: string) => void;
  pending: (localId: string) => boolean;
  pendingList: () => { localId: string; text: string }[];
  failed: () => { localId: string; text: string }[];
} {
  const [entries, setEntries] = useState<OutboxMessage[]>([]);

  const queue = useCallback((text: string): string => {
    localCounter += 1;
    const localId = `local-${Date.now()}-${localCounter}`;
    setEntries((prev) => [...prev, { localId, text, status: 'pending' }]);
    return localId;
  }, []);

  const markSent = useCallback((localId: string): void => {
    setEntries((prev) => prev.filter((entry) => entry.localId !== localId));
  }, []);

  const markFailed = useCallback((localId: string): void => {
    setEntries((prev) =>
      prev.map((entry) => (entry.localId === localId ? { ...entry, status: 'failed' } : entry)),
    );
  }, []);

  const retry = useCallback((localId: string): void => {
    setEntries((prev) =>
      prev.map((entry) => (entry.localId === localId ? { ...entry, status: 'pending' } : entry)),
    );
  }, []);

  const discard = useCallback((localId: string): void => {
    setEntries((prev) => prev.filter((entry) => entry.localId !== localId));
  }, []);

  const pending = useCallback(
    (localId: string): boolean =>
      entries.some((entry) => entry.localId === localId && entry.status === 'pending'),
    [entries],
  );

  const failed = useCallback(
    (): { localId: string; text: string }[] =>
      entries.filter((entry) => entry.status === 'failed').map(({ localId, text }) => ({ localId, text })),
    [entries],
  );

  const pendingList = useCallback(
    (): { localId: string; text: string }[] =>
      entries.filter((entry) => entry.status === 'pending').map(({ localId, text }) => ({ localId, text })),
    [entries],
  );

  return { queue, markSent, markFailed, retry, discard, pending, pendingList, failed };
}

export function useMessages(conversationId: string) {
  const client = useQueryClient();
  const valid = isConversationId(conversationId);
  const query = useQuery({
    queryKey: [...CHAT_KEY, 'thread', conversationId],
    queryFn: () => fetchMessages(conversationId),
    staleTime: 10_000,
    enabled: valid,
  });

  // Realtime prepend (newest-first order kept). No subscription on missing
  // ids (deep-link edge) — nothing to leak to. Foreground refetch rides the
  // shared hook below.
  useEffect(() => {
    if (!valid) return;
    const channel = supabase
      .channel(`thread-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as MessageRow;
          client.setQueryData<{ ok: boolean; data?: MessageRow[] }>(
            [...CHAT_KEY, 'thread', conversationId],
            (cached) => {
              if (!cached || cached.ok !== true || !cached.data) return cached;
              if (cached.data.some((m) => m.id === incoming.id)) return cached;
              return { ok: true, data: [incoming, ...cached.data] };
            },
          );
          void client.invalidateQueries({ queryKey: [...CHAT_KEY, 'list'] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [client, conversationId, valid]);

  useForegroundRefetch(
    useCallback(() => {
      void client.invalidateQueries({ queryKey: [...CHAT_KEY, 'thread', conversationId] });
    }, [client, conversationId]),
  );

  const loaded = query.data;
  const messages = useMemo(() => (loaded?.ok ? loaded.data : []), [loaded]);
  const [lastFetchCount, setLastFetchCount] = useState(MESSAGE_PAGE_SIZE);
  const loadMore = useCallback(() => {
    const oldest = messages[messages.length - 1];
    if (!valid || oldest === undefined) return;
    void fetchMessages(conversationId, { created_at: oldest.created_at, id: oldest.id })
      .then((page) => {
        if (!page.ok) return;
        setLastFetchCount(page.data.length);
        client.setQueryData<{ ok: boolean; data?: MessageRow[] }>(
          [...CHAT_KEY, 'thread', conversationId],
          (cached) => {
            if (!cached || cached.ok !== true || !cached.data) return cached;
            const known = new Set(cached.data.map((m) => m.id));
            return { ok: true, data: [...cached.data, ...page.data.filter((m) => !known.has(m.id))] };
          },
        );
      })
      // Deliberate: silent page-load failure leaves existing messages in
      // place; the user retries by scrolling. Reported for diagnostics —
      // no error surface in the design.
      .catch((error: unknown) => {
        reportError(error, { where: 'chat/load-more' });
      });
  }, [client, conversationId, valid, messages]);

  return {
    ...query,
    loadMore,
    hasMore: lastFetchCount >= MESSAGE_PAGE_SIZE,
  };
}

export function useSendMessage(conversationId: string): {
  send: (text: string) => Promise<import('@/lib/result').ApiResult<MessageRow>>;
  sending: boolean;
  error: string | null;
} {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = useQueryClient();
  const busy = useRef(false);

  const send = useCallback(
    async (text: string) => {
      if (busy.current) {
        return { ok: false as const, error: { code: 'chat/busy', message: 'Envoi en cours.' } };
      }
      busy.current = true;
      setSending(true);
      setError(null);
      try {
        const result = await sendMessage(conversationId, text);
        if (!result.ok) {
          setError(result.error.message);
        } else {
          void client.invalidateQueries({ queryKey: [...CHAT_KEY, 'thread', conversationId] });
          void client.invalidateQueries({ queryKey: [...CHAT_KEY, 'list'] });
        }
        return result;
      } catch {
        const fallback = {
          ok: false as const,
          error: { code: 'chat/send-failed', message: 'Envoi impossible. Réessayez.' },
        };
        setError(fallback.error.message);
        return fallback;
      } finally {
        busy.current = false;
        setSending(false);
      }
    },
    [client, conversationId],
  );

  return { send, sending, error };
}

export function useMarkRead(conversationId: string, signature: string | null): void {
  const client = useQueryClient();
  useEffect(() => {
    if (signature === null) return;
    let cancelled = false;
    void markRead(conversationId)
      .then((result) => {
        if (!cancelled && result.ok) {
          void client.invalidateQueries({ queryKey: [...CHAT_KEY, 'list'] });
        }
      })
      // Deliberate: a failed read-receipt just means the badge refreshes on
      // the next foreground return; never blocks or errors the thread view.
      // Reported for diagnostics.
      .catch((error: unknown) => {
        reportError(error, { where: 'chat/mark-read' });
      });
    return () => {
      cancelled = true;
    };
  }, [client, conversationId, signature]);
}

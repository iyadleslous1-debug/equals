import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAct } from '@/hooks/useAct';
import { reportError } from '@/lib/reporting';
import { blockUser, isBlocked, submitReport, unblockUser } from './api';
import type { ApiResult } from '@/lib/result';

export type SafetyStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * Report + block mutations. Block success busts deck/requests/chat caches so
 * removal is immediate everywhere (no stale ghost rows). Mutations resolve
 * true/false so screens react inline (toast + close) without success effects.
 */
export function useSafety(): {
  report: (reportedId: string, reason: string, description?: string) => Promise<boolean>;
  block: (targetUserId: string) => Promise<boolean>;
  unblock: (targetUserId: string) => Promise<boolean>;
  status: SafetyStatus;
  error: string | null;
  reset: () => void;
} {
  const [status, setStatus] = useState<SafetyStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const { run } = useAct();
  const client = useQueryClient();

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  const settle = useCallback(
    async (work: Promise<ApiResult<unknown>>, bustCaches: boolean, fallback: string): Promise<boolean> => {
      setStatus('pending');
      setError(null);
      try {
        const result = await work;
        if (!result.ok) {
          setError(result.error.message);
          setStatus('error');
          return false;
        }
      } catch (error) {
        reportError(error, { where: 'safety/settle' });
        setError(fallback);
        setStatus('error');
        return false;
      }
      setError(null);
      setStatus('success');
      if (bustCaches) {
        // Blanket invalidation is deliberate: deck, requests and chat caches
        // must all drop the blocked party at once, and importing other
        // features' query keys would break the no-cross-import rule.
        // Cost: profile cache refetches too — negligible at MVP scale.
        void client.invalidateQueries();
      }
      return true;
    },
    [client],
  );

  const report = useCallback(
    (reportedId: string, reason: string, description?: string): Promise<boolean> => {
      reset();
      return run(() =>
        settle(submitReport(reportedId, reason, description), false, 'Signalement impossible. Réessayez.'),
      ).then((done) => done ?? false);
    },
    [run, settle, reset],
  );

  const block = useCallback(
    (targetUserId: string): Promise<boolean> => {
      reset();
      return run(() => settle(blockUser(targetUserId), true, 'Blocage impossible. Réessayez.')).then(
        (done) => done ?? false,
      );
    },
    [run, settle, reset],
  );

  const unblock = useCallback(
    (targetUserId: string): Promise<boolean> => {
      reset();
      return run(() => settle(unblockUser(targetUserId), true, 'Déblocage impossible. Réessayez.')).then(
        (done) => done ?? false,
      );
    },
    [run, settle, reset],
  );

  return { report, block, unblock, status, error, reset };
}

/** Whether I currently block the target (drives block/unblock menu state). */
export function useIsBlocked(targetUserId: string | null): boolean {
  const { data } = useQuery({
    queryKey: ['safety', 'blocked', targetUserId ?? 'none'],
    queryFn: () =>
      targetUserId ? isBlocked(targetUserId) : Promise.resolve({ ok: true, data: false } as const),
    staleTime: 30_000,
    enabled: targetUserId !== null && targetUserId !== '',
  });
  return data?.ok === true ? (data.data ?? false) : false;
}

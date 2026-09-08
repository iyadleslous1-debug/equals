import { useQueries, useQueryClient } from '@tanstack/react-query';
import { resolveStorageUrl } from '@/lib/storage-url';

export interface SignedUrlMap {
  urls: Record<string, string>;
  failedIds: string[];
  reload: () => void;
}

/** Signed-URL cache window — comfortably inside the 1h URL TTL. */
export const SIGNED_URL_STALE_MS = 30 * 60_000;

/**
 * Signed display URLs for a list of rows. Single home for the per-feature
 * photo-URL hooks (audit S1): same key shape, same TTL relationship, same
 * fail-closed semantics (unresolved ids are absent from `urls`; hard
 * failures land in `failedIds` for retry tiles — callers fall back, never
 * blank). Bucket paths stay private; legacy https URLs pass through.
 */
export function useSignedUrls<T>(
  keyPrefix: string,
  items: T[],
  keyOf: (item: T) => string,
  pathOf: (item: T) => string | null,
): SignedUrlMap {
  const client = useQueryClient();
  const results = useQueries({
    queries: items.map((item) => ({
      queryKey: [keyPrefix, keyOf(item), pathOf(item)],
      queryFn: () => {
        const path = pathOf(item);
        return path ? resolveStorageUrl('profile-photos', path) : Promise.resolve(null);
      },
      staleTime: SIGNED_URL_STALE_MS,
    })),
  });
  const urls: Record<string, string> = {};
  const failedIds: string[] = [];
  items.forEach((item, index) => {
    const data = results[index]?.data;
    if (data?.ok) urls[keyOf(item)] = data.data;
    else if (results[index]?.status === 'error' || (data && !data.ok)) failedIds.push(keyOf(item));
  });
  return {
    urls,
    failedIds,
    reload: () => void client.invalidateQueries({ queryKey: [keyPrefix] }),
  };
}

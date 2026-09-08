import { supabase } from './supabase';
import { err, ok, toAppError, type ApiResult } from './result';

/**
 * Display URL for a photo reference. Absolute HTTPS URLs (legacy seeds)
 * pass through; bucket paths become time-boxed signed URLs since no bucket
 * is ever public. Plain http and non-URL strings fall through to the signed
 * path and fail closed — a stranger-controlled `url` must never make a
 * device fetch an arbitrary host (IP-leak via tracking pixel).
 */
export async function resolveStorageUrl(
  bucket: string,
  pathOrUrl: string,
  ttlSec = 3600,
): Promise<ApiResult<string>> {
  if (pathOrUrl.startsWith('https://')) return ok(pathOrUrl);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(pathOrUrl, ttlSec);
  if (error !== null || data === null) {
    return err('storage/url-failed', 'Photo illisible. Réessayez.', toAppError(error));
  }
  return ok(data.signedUrl);
}

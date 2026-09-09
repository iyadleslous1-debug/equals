import { config } from './config';
import { supabase } from './supabase';
import { err, ok, toAppError, type ApiResult } from './result';
import { isSafeExternalUrl } from './security';

/**
 * Hosts allowed to serve photo bytes directly. The Supabase storage host is
 * derived from config; `picsum.photos` covers legacy seed URLs only.
 */
function trustedPhotoHosts(): string[] {
  try {
    return [new URL(config.supabaseUrl).hostname, 'picsum.photos'];
  } catch {
    return ['picsum.photos'];
  }
}

/**
 * Display URL for a photo reference. Absolute HTTPS URLs *on a trusted host*
 * pass through; everything else becomes a time-boxed signed URL since no
 * bucket is ever public. Plain http, bare strings, and off-allowlist hosts
 * fall through to the signed path and fail closed — a stranger-controlled
 * `url` must never make a device fetch an arbitrary host (IP-leak via
 * tracking pixel).
 */
export async function resolveStorageUrl(
  bucket: string,
  pathOrUrl: string,
  ttlSec = 3600,
): Promise<ApiResult<string>> {
  if (isSafeExternalUrl(pathOrUrl, trustedPhotoHosts())) return ok(pathOrUrl);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(pathOrUrl, ttlSec);
  if (error !== null || data === null) {
    return err('storage/url-failed', "Couldn't load photo. Try again.", toAppError(error));
  }
  return ok(data.signedUrl);
}

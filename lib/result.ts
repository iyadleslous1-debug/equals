/**
 * Consistent API response shape.
 *
 * Every async boundary (Supabase calls, SMS providers, future AI/edge calls)
 * returns `ApiResult<T>` instead of throwing or returning ad-hoc shapes:
 *
 * ```ts
 * const result = await signInWithOtp('+2135551234');
 * if (!result.ok) return showError(result.error.message);
 * ```
 *
 * Supabase errors (`PostgrestError`, `AuthError`) are normalised to `AppError`
 * via `toAppError`, so UI code only ever handles one error type.
 */

export interface AppError {
  /** Stable machine-readable code, e.g. `auth/otp-expired`, `network/offline`. */
  code: string;
  /** Human-safe message. Never leaks tokens, SQL, or raw provider payloads. */
  message: string;
  /** Debug-only payload. Never rendered directly to users. */
  details?: unknown;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: AppError };

export function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

export function err<T = never>(code: string, message: string, details?: unknown): ApiResult<T> {
  return { ok: false, error: { code, message, details } };
}

interface SupabaseLikeError {
  code?: string | null;
  message?: string | null;
  status?: number | null;
}

/** Normalise unknown throwables / Supabase errors into one `AppError`. */
export function toAppError(error: unknown, fallbackCode = 'unknown/error'): AppError {
  if (error !== null && typeof error === 'object') {
    const candidate = error as SupabaseLikeError & { name?: string };
    const code = typeof candidate.code === 'string' && candidate.code !== '' ? candidate.code : fallbackCode;
    const message =
      typeof candidate.message === 'string' && candidate.message !== ''
        ? candidate.message
        : 'Something went wrong. Please try again.';
    return { code, message, details: error };
  }
  if (typeof error === 'string') return { code: fallbackCode, message: error };
  return { code: fallbackCode, message: 'Something went wrong. Please try again.' };
}

export interface RetryOptions {
  retries?: number;
  /** Base delay in ms; grows linearly per attempt (attempt × delayMs). */
  delayMs?: number;
  /** Return true to retry this error, false to fail fast (e.g. 4xx). */
  shouldRetry?: (error: unknown) => boolean;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Run `fn` with bounded retries for transient failures (network, 5xx). */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 2, delayMs = 800, shouldRetry = () => true } = options;
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (attempt > retries || !shouldRetry(error)) throw error;
      await sleep(delayMs * attempt);
    }
  }
}

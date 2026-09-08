/**
 * Send-rate limiting (client-side first line of defence).
 *
 * Rules: max 3 sends per 10 minutes per key, with a 60s cooldown between
 * sends. Keys are E.164 numbers for SMS OTPs or `email:<address>` for email
 * confirmations — the limiter is channel-agnostic.
 *
 * State is a plain value (persist it in SecureStore/AsyncStorage in
 * production; the in-memory map here stops casual abuse and double-taps).
 *
 * This NEVER replaces server-side limits — Supabase Auth enforces its own
 * per-account rate limits. Defence in depth.
 */

export const OTP_LIMITS = {
  /** Max codes per rolling window, per phone number. */
  maxAttempts: 3,
  /** Rolling window in ms. */
  windowMs: 10 * 60 * 1000,
  /** Minimum gap between two sends to the same number, in ms. */
  cooldownMs: 60 * 1000,
} as const;

export interface ThrottleState {
  /** Epoch-ms timestamps of recent sends (pruned to the rolling window). */
  attempts: number[];
}

export interface ThrottleVerdict {
  allowed: boolean;
  /** Seconds until the next send is allowed (0 when allowed). */
  retryAfterSec: number;
}

function prune(attempts: number[], now: number): number[] {
  return attempts.filter((ts) => now - ts < OTP_LIMITS.windowMs);
}

/** Pure check — no side effects, fully unit-testable. */
export function checkOtpThrottle(state: ThrottleState, now: number): ThrottleVerdict {
  const recent = prune(state.attempts, now);
  const last = recent[recent.length - 1];
  if (last !== undefined) {
    const sinceLast = now - last;
    if (sinceLast < OTP_LIMITS.cooldownMs) {
      return { allowed: false, retryAfterSec: Math.ceil((OTP_LIMITS.cooldownMs - sinceLast) / 1000) };
    }
  }
  if (recent.length >= OTP_LIMITS.maxAttempts) {
    const oldest = recent[0] as number;
    return { allowed: false, retryAfterSec: Math.ceil((OTP_LIMITS.windowMs - (now - oldest)) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

/** Pure transition — returns the next state after a send at `now`. */
export function recordOtpAttempt(state: ThrottleState, now: number): ThrottleState {
  return { attempts: [...prune(state.attempts, now), now] };
}

const states = new Map<string, ThrottleState>();

/** Convenience singleton used by auth senders (keyed by number or email). */
export function consumeOtpAllowance(key: string, now: number = Date.now()): ThrottleVerdict {
  const state = states.get(key) ?? { attempts: [] };
  const verdict = checkOtpThrottle(state, now);
  if (verdict.allowed) states.set(key, recordOtpAttempt(state, now));
  return verdict;
}

/** Test helper — clears all in-memory throttle state. */
export function resetOtpThrottle(): void {
  states.clear();
}

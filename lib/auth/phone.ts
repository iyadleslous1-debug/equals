/**
 * Phone / OTP auth — RESERVED for later, intentionally not wired in MVP0.
 *
 * Why stubs instead of deletion: the `users.phone_number` column already exists
 * (nullable + unique since migration 0002), and the signup trigger already
 * stores `NEW.phone` when present. When phone auth ships, this module gains
 * real implementations and NOTHING in the schema, RLS, types, or call sites
 * changes shape:
 *
 *   1. `signInWithPhone` → validate via `lib/phone.ts`, throttle via
 *      `lib/otp-throttle.ts`, then `supabase.auth.signInWithOtp({ phone })`.
 *   2. `verifyPhoneOtp` → `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`.
 *   3. Delivery follows the `SmsProvider` contract in `lib/sms.ts` through the
 *      Custom SMS sender hook (local DZ aggregator — see that file).
 *
 * Until then both functions fail closed with `auth/phone-not-enabled` so any
 * premature UI wiring surfaces a clear message instead of silent breakage.
 */
import { normalizeDzPhone } from '../phone';
import { err, type ApiResult } from '../result';

export function signInWithPhone(rawPhone: string): ApiResult<never> {
  const phone = normalizeDzPhone(rawPhone);
  if (!phone.ok) return phone;
  return err('auth/phone-not-enabled', 'Phone sign-in is coming later. Please use email for now.');
}

export function verifyPhoneOtp(rawPhone: string): ApiResult<never> {
  const phone = normalizeDzPhone(rawPhone);
  if (!phone.ok) return phone;
  return err('auth/phone-not-enabled', 'Phone sign-in is coming later. Please use email for now.');
}

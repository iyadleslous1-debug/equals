/**
 * Pure credential validators — no native imports, fully unit-tested.
 * Shared by every auth method (email today, phone/OTP tomorrow).
 */
import { err, ok, type ApiResult } from '../result';

export const MIN_PASSWORD_LENGTH = 8;

/** Trim + lowercase + sanity-check an email address. */
export function normalizeEmail(input: string): ApiResult<string> {
  const email = input.trim().toLowerCase();
  if (email === '') return err('auth/email-empty', 'Enter your email address.');
  // Pragmatic RFC-lite check: local@domain.tld, no spaces. Supabase re-validates server-side.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return err('auth/email-invalid', 'That email looks invalid. Double-check it.');
  }
  if (email.length > 254) return err('auth/email-invalid', 'That email is too long.');
  return ok(email);
}

/** Enforce the client-side password floor (Supabase enforces its own too). */
export function validatePassword(password: string): ApiResult<string> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return err('auth/password-weak', `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`);
  }
  return ok(password);
}

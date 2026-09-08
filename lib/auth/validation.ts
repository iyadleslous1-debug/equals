/**
 * Pure credential validators — no native imports, fully unit-tested.
 * Shared by every auth method (email today, phone/OTP tomorrow).
 */
import { err, ok, type ApiResult } from '../result';

export const MIN_PASSWORD_LENGTH = 8;

/** Trim + lowercase + sanity-check an email address. */
export function normalizeEmail(input: string): ApiResult<string> {
  const email = input.trim().toLowerCase();
  if (email === '') return err('auth/email-empty', 'Entrez votre adresse email.');
  // Pragmatic RFC-lite check: local@domain.tld, no spaces. Supabase re-validates server-side.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return err('auth/email-invalid', 'Cet email semble invalide. Vérifiez-le.');
  }
  if (email.length > 254) return err('auth/email-invalid', 'Cet email est trop long.');
  return ok(email);
}

/** Enforce the client-side password floor (Supabase enforces its own too). */
export function validatePassword(password: string): ApiResult<string> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return err(
      'auth/password-weak',
      `Utilisez au moins ${MIN_PASSWORD_LENGTH} caractères pour votre mot de passe.`,
    );
  }
  return ok(password);
}

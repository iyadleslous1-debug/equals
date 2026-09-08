/**
 * Email + password auth (MVP0 primary method — free, no per-message cost).
 *
 * Verification uses Supabase's built-in email confirmation:
 *  - `signUpWithEmail` sends a 6-digit confirmation code (Supabase dashboard →
 *    Auth → Email → "Confirm signup" template). Free on the standard tier.
 *  - `verifyEmailOtp` confirms it in-app — no browser redirect needed.
 *  - Link-based confirmation also works if enabled: set the redirect allow-list
 *    to `dzconnect://auth/callback` and handle it in the future `(auth)` group.
 *
 * Resend abuse is throttled with the shared OTP limiter (same 60s cooldown,
 * 3 sends / 10 min, keyed by `email:<address>`).
 */
import type { Session } from '@supabase/supabase-js';
import { consumeOtpAllowance } from '../otp-throttle';
import { createLogger } from '../logger';
import { timed } from '../perf';
import { err, ok, toAppError, withRetry, type ApiResult } from '../result';
import { supabase } from '../supabase';
import { normalizeEmail, validatePassword } from './validation';

const log = createLogger('auth/email');

/** Create the account and trigger the confirmation email. */
export async function signUpWithEmail(
  rawEmail: string,
  password: string,
): Promise<ApiResult<{ needsConfirmation: boolean }>> {
  const email = normalizeEmail(rawEmail);
  if (!email.ok) return email;
  const valid = validatePassword(password);
  if (!valid.ok) return valid;

  try {
    const { data, error } = await timed('auth.signup', () =>
      withRetry(() => supabase.auth.signUp({ email: email.data, password: valid.data })),
    );
    if (error !== null) return err('auth/signup-failed', friendly(error.message), toAppError(error));
    // Supabase returns a session only when confirmation is OFF; with
    // confirmation ON the user must verify first.
    const needsConfirmation = data.session === null;
    log.info('Signup requested.', { needsConfirmation });
    return ok({ needsConfirmation });
  } catch (error) {
    return err(
      'auth/signup-failed',
      'Could not create the account. Check your connection.',
      toAppError(error),
    );
  }
}

/** Sign in. Unconfirmed emails get a distinct, actionable error. */
export async function signInWithEmail(rawEmail: string, password: string): Promise<ApiResult<Session>> {
  const email = normalizeEmail(rawEmail);
  if (!email.ok) return email;
  if (password === '') return err('auth/password-empty', 'Enter your password.');

  try {
    const { data, error } = await timed('auth.signin', () =>
      supabase.auth.signInWithPassword({ email: email.data, password }),
    );
    if (error !== null || data.session === null) {
      return err('auth/signin-failed', friendly(error?.message ?? ''), error ? toAppError(error) : undefined);
    }
    log.info('Signed in with email.');
    return ok(data.session);
  } catch (error) {
    return err('auth/signin-failed', 'Could not sign in. Check your connection.', toAppError(error));
  }
}

/** Confirm the 6-digit signup code from the email. */
export async function verifyEmailOtp(rawEmail: string, token: string): Promise<ApiResult<Session>> {
  const email = normalizeEmail(rawEmail);
  if (!email.ok) return email;
  const code = token.trim();
  if (!/^\d{6}$/.test(code)) return err('auth/otp-invalid', 'Enter the 6-digit code from the email.');

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.data,
      token: code,
      type: 'signup',
    });
    if (error !== null || data.session === null) {
      return err(
        'auth/otp-verify-failed',
        friendly(error?.message ?? ''),
        error ? toAppError(error) : undefined,
      );
    }
    log.info('Email confirmed — session established.');
    return ok(data.session);
  } catch (error) {
    return err('auth/otp-verify-failed', 'Verification failed. Check your connection.', toAppError(error));
  }
}

/** Resend the confirmation email (throttled like OTP sends). */
export async function resendSignupConfirmation(rawEmail: string): Promise<ApiResult<void>> {
  const email = normalizeEmail(rawEmail);
  if (!email.ok) return email;

  const allowance = consumeOtpAllowance(`email:${email.data}`);
  if (!allowance.allowed) {
    return err('auth/resend-throttled', `Too many emails. Try again in ${allowance.retryAfterSec}s.`, {
      retryAfterSec: allowance.retryAfterSec,
    });
  }

  const { error } = await supabase.auth.resend({ type: 'signup', email: email.data });
  if (error !== null) return err('auth/resend-failed', friendly(error.message), toAppError(error));
  log.info('Confirmation email resent.');
  return ok(undefined);
}

/** Map Supabase messages to DZ-friendly copy (never leak internals). */
function friendly(raw: string): string {
  if (/already registered|already exists|duplicate/i.test(raw)) {
    return 'An account with this email already exists. Try signing in.';
  }
  if (/invalid login|invalid credentials/i.test(raw)) return 'Wrong email or password.';
  if (/email not confirmed|not confirmed/i.test(raw)) {
    return 'Confirm your email first — check your inbox for the code.';
  }
  if (/rate limit/i.test(raw)) return 'Too many attempts. Wait a few minutes and try again.';
  if (/expired|invalid.*token|invalid.*code/i.test(raw)) {
    return 'That code is wrong or expired. Request a fresh one.';
  }
  if (/password/i.test(raw) && /weak|short|length/i.test(raw)) {
    return 'That password is too weak. Use at least 8 characters.';
  }
  return 'Something went wrong. Please try again.';
}

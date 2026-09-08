import type { AppError } from '@/lib/result';

export type SignInNext =
  | { kind: 'confirm'; email: string }
  | { kind: 'throttled'; message: string }
  | { kind: 'message'; message: string };

/**
 * Map a sign-in failure to the next UI state. Routes on stable `AppError.code`
 * — never on message text, so localizing copy cannot break navigation.
 */
export function signInNextStep(error: AppError, email = ''): SignInNext {
  if (error.code === 'auth/email-not-confirmed') return { kind: 'confirm', email };
  if (error.code === 'auth/rate-limited') return { kind: 'throttled', message: error.message };
  return { kind: 'message', message: error.message };
}

/** Signup failure that should offer a "sign in instead" path. */
export function isAlreadyRegistered(error: AppError): boolean {
  return error.code === 'auth/email-registered';
}

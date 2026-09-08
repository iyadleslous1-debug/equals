/**
 * Auth façade — method-agnostic surface for the rest of the app.
 *
 * Feature code imports from `@/lib/auth` (this file) and never from
 * `./email` / `./phone` directly, so adding phone/OTP later means filling in
 * `phone.ts`, not touching call sites:
 *
 * ```ts
 * import { signInWithEmail, signOut, getSession } from '@/lib/auth';
 * ```
 */
import { err, ok, toAppError, type ApiResult } from '../result';
import { supabase } from '../supabase';

export { resendSignupConfirmation, signInWithEmail, signUpWithEmail, verifyEmailOtp } from './email';
export { signInWithPhone, verifyPhoneOtp } from './phone';
export { MIN_PASSWORD_LENGTH, normalizeEmail, validatePassword } from './validation';

export async function signOut(): Promise<ApiResult<void>> {
  const { error } = await supabase.auth.signOut();
  if (error !== null) return err('auth/signout-failed', 'Could not sign out.', toAppError(error));
  return ok(undefined);
}

export async function getSession(): Promise<import('@supabase/supabase-js').Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

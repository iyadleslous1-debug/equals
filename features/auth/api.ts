import { resendSignupConfirmation, signInWithEmail, signUpWithEmail, verifyEmailOtp } from '@/lib/auth';
import type { ApiResult } from '@/lib/result';
import type { Session } from '@supabase/supabase-js';
import { clearPendingEmail, savePendingEmail } from './pendingEmail';

/**
 * Auth feature API — thin orchestration over `@/lib/auth` (which already
 * returns `ApiResult`). Adds pending-email persistence so an interrupted
 * signup resumes at the code screen. No UI imports, no navigation.
 */

export async function signUp(
  email: string,
  password: string,
): Promise<ApiResult<{ needsConfirmation: boolean }>> {
  const result = await signUpWithEmail(email, password);
  if (result.ok && result.data.needsConfirmation) {
    await savePendingEmail(email);
  }
  return result;
}

export async function logIn(email: string, password: string): Promise<ApiResult<Session>> {
  return signInWithEmail(email, password);
}

export async function confirmCode(email: string, code: string): Promise<ApiResult<Session>> {
  const result = await verifyEmailOtp(email, code);
  if (result.ok) {
    await clearPendingEmail();
  }
  return result;
}

export async function resendCode(email: string): Promise<ApiResult<void>> {
  return resendSignupConfirmation(email);
}

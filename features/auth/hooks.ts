import { useCallback, useEffect, useRef, useState } from 'react';
import { OTP_COOLDOWN_SECONDS } from '@/constants/app';
import { queryClient } from '@/lib/query-client';
import { signOut as libSignOut } from '@/lib/auth';
import { createLogger } from '@/lib/logger';
import { reportError } from '@/lib/reporting';
import type { AppError } from '@/lib/result';
import { confirmCode, logIn, resendCode, signUp } from './api';
import { clearPendingEmail, getPendingEmail } from './pendingEmail';
import { useResendCountdown } from './useResendCountdown';

export type MutationStatus = 'idle' | 'pending' | 'success' | 'error';

const log = createLogger('auth/hooks');

/**
 * One-shot auth mutations use local state, not React Query: sign-in attempts
 * have no caching semantics (nothing to stale/cache/share), so `useMutation`
 * would add a provider requirement to every auth screen for zero benefit.
 * All server *data* in later features stays on React Query per the repo rule.
 */

function useResettable<T>(initial: T): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const [state, setState] = useState(initial);
  const reset = useCallback(() => setState(initial), [initial]);
  return [state, setState, reset];
}

export function useSignUp(): {
  signUp: (email: string, password: string) => void;
  reset: () => void;
  status: MutationStatus;
  error: AppError | null;
  needsConfirmation: boolean;
} {
  const [status, setStatus] = useState<MutationStatus>('idle');
  const [error, setError] = useState<AppError | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setNeedsConfirmation(false);
  }, []);

  const run = useCallback(async (email: string, password: string) => {
    setStatus('pending');
    setError(null);
    try {
      const result = await signUp(email, password);
      if (!result.ok) {
        setError(result.error);
        setStatus('error');
        return;
      }
      setNeedsConfirmation(result.data.needsConfirmation);
      setStatus('success');
    } catch (error) {
      reportError(error, { where: 'auth/signup' });
      setError({ code: 'auth/signup-failed', message: "Couldn't create your account. Try again." });
      setStatus('error');
    }
  }, []);

  return { signUp: run, reset, status, error, needsConfirmation };
}

export function useLogin(): {
  logIn: (email: string, password: string) => void;
  reset: () => void;
  status: MutationStatus;
  error: AppError | null;
} {
  const [status, setStatus] = useState<MutationStatus>('idle');
  const [error, setError] = useState<AppError | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  const run = useCallback(async (email: string, password: string) => {
    setStatus('pending');
    setError(null);
    try {
      const result = await logIn(email, password);
      if (!result.ok) {
        setError(result.error);
        setStatus('error');
        return;
      }
      setStatus('success');
    } catch (error) {
      reportError(error, { where: 'auth/signin' });
      setError({ code: 'auth/signin-failed', message: "Couldn't log you in. Try again." });
      setStatus('error');
    }
  }, []);

  return { logIn: run, reset, status, error };
}

export function useConfirmCode(): {
  confirm: (email: string, code: string) => void;
  reset: () => void;
  status: MutationStatus;
  error: AppError | null;
} {
  const [status, setStatus] = useState<MutationStatus>('idle');
  const [error, setError] = useState<AppError | null>(null);
  const busy = useRef(false);

  const reset = useCallback(() => {
    busy.current = false;
    setStatus('idle');
    setError(null);
  }, []);

  const run = useCallback(async (email: string, code: string) => {
    if (busy.current) return;
    busy.current = true;
    setStatus('pending');
    setError(null);
    try {
      const result = await confirmCode(email, code);
      if (!result.ok) {
        setError(result.error);
        setStatus('error');
        return;
      }
      setStatus('success');
    } catch (error) {
      reportError(error, { where: 'auth/otp-verify' });
      setError({ code: 'auth/otp-verify-failed', message: "Couldn't verify. Try again." });
      setStatus('error');
    } finally {
      busy.current = false;
    }
  }, []);

  return { confirm: run, reset, status, error };
}

function retryAfterSec(error: AppError): number | null {
  const details = error.details as { retryAfterSec?: unknown } | undefined;
  return typeof details?.retryAfterSec === 'number' ? details.retryAfterSec : null;
}

export function useResendCode(): {
  resend: (email: string) => void;
  label: string;
  canResend: boolean;
  secondsLeft: number;
  status: MutationStatus;
  error: AppError | null;
} {
  const [status, setStatus] = useState<MutationStatus>('idle');
  const [error, setError] = useState<AppError | null>(null);
  const { secondsLeft, label, start } = useResendCountdown(OTP_COOLDOWN_SECONDS);

  // Entering the confirm screen right after signup means a code was just
  // sent — the cooldown is already running server-side.
  useEffect(() => {
    start(OTP_COOLDOWN_SECONDS);
  }, [start]);

  const resend = useCallback(
    async (email: string) => {
      if (secondsLeft > 0) return;
      setStatus('pending');
      setError(null);
      try {
        const result = await resendCode(email);
        if (!result.ok) {
          setError(result.error);
          setStatus('error');
          const wait = retryAfterSec(result.error);
          if (wait !== null) start(wait);
          return;
        }
        setStatus('success');
        start(OTP_COOLDOWN_SECONDS);
      } catch (error) {
        reportError(error, { where: 'auth/resend' });
        setError({ code: 'auth/resend-failed', message: "Couldn't send. Try again." });
        setStatus('error');
      }
    },
    [secondsLeft, start],
  );

  return { resend, label, canResend: secondsLeft === 0, secondsLeft, status, error };
}

export function useSignOut(): {
  signOut: () => Promise<void>;
  status: MutationStatus;
  error: AppError | null;
} {
  const [status, setStatus] = useState<MutationStatus>('idle');
  const [error, setError] = useState<AppError | null>(null);

  const run = useCallback(async () => {
    setStatus('pending');
    setError(null);
    try {
      const result = await libSignOut();
      if (!result.ok) {
        setError(result.error);
        setStatus('error');
        return;
      }
    } catch (error) {
      reportError(error, { where: 'auth/signout' });
      setError({ code: 'auth/signout-failed', message: "Couldn't log you out. Try again." });
      setStatus('error');
      return;
    }
    // Server sign-out succeeded: local cleanup must not be skipped by a
    // SecureStore failure — fall back to login on next launch instead.
    try {
      await clearPendingEmail();
    } catch (error) {
      reportError(error, { where: 'auth/signout-cleanup' });
    }
    queryClient.clear();
    setStatus('idle');
  }, []);

  return { signOut: run, status, error };
}

/**
 * Pending-email ownership for routes: loading/error state lives here so
 * screens stay declarative. `enabled=false` skips the read (e.g. confirm
 * screen with an explicit `?email=` param). Read failures fall back to
 * `null` (→ login) and are logged, never hung on.
 */
export function usePendingEmail(enabled: boolean): {
  email: string | null | undefined;
  error: AppError | null;
} {
  const [{ email, error }, setState] = useResettable<{
    email: string | null | undefined;
    error: AppError | null;
  }>({ email: undefined, error: null });

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    getPendingEmail()
      .then((stored) => {
        if (mounted) setState({ email: stored, error: null });
      })
      .catch((failure: unknown) => {
        log.error('Pending-email read failed; falling back to login.', { failure });
        if (mounted) {
          setState({
            email: null,
            error: { code: 'auth/pending-read-failed', message: 'Unreadable.' },
          });
        }
      });
    return () => {
      mounted = false;
    };
  }, [enabled, setState]);

  return { email, error };
}

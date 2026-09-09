import { useCallback, useEffect, useRef, useState } from 'react';

/** Button copy for the resend-code control. */
export function resendLabel(secondsLeft: number): string {
  return secondsLeft <= 0 ? 'Resend code' : `Resend in ${secondsLeft}s`;
}

/**
 * OTP-resend cooldown timer. `start(seconds)` begins (or restarts) the
 * countdown — call it after signup and after every resend, using the
 * server-provided `retryAfterSec` when throttled.
 */
export function useResendCountdown(defaultSeconds: number): {
  secondsLeft: number;
  label: string;
  start: (seconds?: number) => void;
} {
  // Assume the cooldown is active until proven otherwise: the only caller is
  // the post-signup resend flow, where a code was just sent. This also closes
  // the first-frame flash where `canResend` would read true before effects run.
  const [secondsLeft, setSecondsLeft] = useState(defaultSeconds);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current !== null) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(
    (seconds: number = defaultSeconds) => {
      stop();
      setSecondsLeft(seconds);
      timer.current = setInterval(() => {
        setSecondsLeft((left) => {
          if (left <= 1) {
            if (timer.current !== null) {
              clearInterval(timer.current);
              timer.current = null;
            }
            return 0;
          }
          return left - 1;
        });
      }, 1000);
    },
    [defaultSeconds, stop],
  );

  useEffect(() => stop, [stop]);

  return { secondsLeft, label: resendLabel(secondsLeft), start };
}

import {
  OTP_LIMITS,
  checkOtpThrottle,
  consumeOtpAllowance,
  recordOtpAttempt,
  resetOtpThrottle,
  type ThrottleState,
} from '../lib/otp-throttle';

const NOW = 1_000_000;

function stateWith(attempts: number[]): ThrottleState {
  return { attempts };
}

describe('checkOtpThrottle', () => {
  it('allows a first send', () => {
    expect(checkOtpThrottle({ attempts: [] }, NOW)).toEqual({ allowed: true, retryAfterSec: 0 });
  });

  it('enforces the 60s cooldown', () => {
    const verdict = checkOtpThrottle(stateWith([NOW - 10_000]), NOW);
    expect(verdict.allowed).toBe(false);
    expect(verdict.retryAfterSec).toBeLessThanOrEqual(60);
    expect(verdict.retryAfterSec).toBeGreaterThan(0);
  });

  it('caps sends per rolling window', () => {
    const attempts = [NOW - 9 * 60_000, NOW - 5 * 60_000, NOW - 2 * 60_000];
    const verdict = checkOtpThrottle(stateWith(attempts), NOW);
    expect(verdict.allowed).toBe(false);
    expect(verdict.retryAfterSec).toBeGreaterThan(0);
  });

  it('forgets attempts outside the window', () => {
    const verdict = checkOtpThrottle(stateWith([NOW - OTP_LIMITS.windowMs - 1]), NOW);
    expect(verdict.allowed).toBe(true);
  });
});

describe('recordOtpAttempt', () => {
  it('appends and prunes stale attempts', () => {
    const next = recordOtpAttempt(stateWith([NOW - OTP_LIMITS.windowMs - 1, NOW - 1_000]), NOW);
    expect(next.attempts).toEqual([NOW - 1_000, NOW]);
  });
});

describe('consumeOtpAllowance', () => {
  beforeEach(resetOtpThrottle);

  it('tracks allowance per phone number', () => {
    expect(consumeOtpAllowance('+213555000001', NOW).allowed).toBe(true);
    expect(consumeOtpAllowance('+213555000001', NOW).allowed).toBe(false); // cooldown
    expect(consumeOtpAllowance('+213555000002', NOW).allowed).toBe(true); // other number unaffected
  });
});

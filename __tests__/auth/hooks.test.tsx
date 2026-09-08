import { act, renderHook } from '@testing-library/react-native';
import { err, ok } from '@/lib/result';
import { useLogin, usePendingEmail, useResendCode } from '@/features/auth/hooks';
import { getPendingEmail } from '@/features/auth/pendingEmail';
import { logIn, resendCode } from '@/features/auth/api';

jest.useFakeTimers();

jest.mock('@/features/auth/api', () => ({
  signUp: jest.fn(),
  logIn: jest.fn(),
  confirmCode: jest.fn(),
  resendCode: jest.fn(),
}));

jest.mock('@/features/auth/pendingEmail', () => ({
  getPendingEmail: jest.fn(),
  savePendingEmail: jest.fn(),
  clearPendingEmail: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  },
}));

const mockResend = resendCode as jest.Mock;
const mockGetPending = getPendingEmail as jest.Mock;
const mockLogIn = logIn as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useLogin throw-path (audit S3)', () => {
  it('leaves pending and surfaces an error when the api throws', async () => {
    mockLogIn.mockRejectedValue(new Error('SecureStore locked'));
    const { result } = await renderHook(() => useLogin());
    await act(async () => {
      result.current.logIn('a@b.co', 'Seedpass123!');
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error?.message).toBe('Connexion impossible. Réessayez.');
  });
});

describe('useResendCode', () => {
  it('starts the cooldown on mount and restarts after a successful resend', async () => {
    mockResend.mockResolvedValue(ok(undefined));
    const { result } = await renderHook(() => useResendCode());
    expect(result.current.secondsLeft).toBe(60);
    expect(result.current.canResend).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(60000);
    });
    expect(result.current.canResend).toBe(true);

    await act(async () => {
      await result.current.resend('a@b.co');
    });
    expect(mockResend).toHaveBeenCalledWith('a@b.co');
    expect(result.current.secondsLeft).toBe(60);
  });

  it('surfaces throttle errors with the server retry delay', async () => {
    mockResend.mockResolvedValue(err('auth/resend-throttled', 'Trop.', { retryAfterSec: 120 }));
    const { result } = await renderHook(() => useResendCode());
    await act(async () => {
      jest.advanceTimersByTime(60000);
    });
    await act(async () => {
      await result.current.resend('a@b.co');
    });
    expect(result.current.error?.message).toBe('Trop.');
    expect(result.current.secondsLeft).toBe(120);
  });
});

describe('usePendingEmail', () => {
  it('reads only when enabled and returns the stored address', async () => {
    mockGetPending.mockResolvedValue('a@b.co');
    const { result, rerender } = await renderHook(({ on }: { on: boolean }) => usePendingEmail(on), {
      initialProps: { on: false },
    });
    expect(result.current.email).toBeUndefined();
    expect(mockGetPending).not.toHaveBeenCalled();

    await rerender({ on: true });
    await act(async () => undefined);
    expect(result.current.email).toBe('a@b.co');
  });

  it('falls back to null when storage rejects on first read', async () => {
    mockGetPending.mockRejectedValue(new Error('locked'));
    const { result } = await renderHook(() => usePendingEmail(true));
    // Fully-async render flushes the effect + rejection before returning.
    expect(result.current.email).toBeNull();
    expect(result.current.error?.code).toBe('auth/pending-read-failed');
  });
});

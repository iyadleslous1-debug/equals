import { act, renderHook } from '@testing-library/react-native';
import { err, ok } from '@/lib/result';
import { usePendingEmail, useResendCode } from '@/features/auth/hooks';
import { getPendingEmail } from '@/features/auth/pendingEmail';
import { resendCode } from '@/features/auth/api';

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useResendCode', () => {
  it('starts the cooldown on mount and restarts after a successful resend', async () => {
    mockResend.mockResolvedValue(ok(undefined));
    const { result } = renderHook(() => useResendCode());
    expect(result.current.secondsLeft).toBe(60);
    expect(result.current.canResend).toBe(false);

    act(() => {
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
    const { result } = renderHook(() => useResendCode());
    act(() => {
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
    const { result, rerender } = renderHook(({ on }: { on: boolean }) => usePendingEmail(on), {
      initialProps: { on: false },
    });
    expect(result.current.email).toBeUndefined();
    expect(mockGetPending).not.toHaveBeenCalled();

    rerender({ on: true });
    await act(async () => undefined);
    expect(result.current.email).toBe('a@b.co');
  });

  it('falls back to null when storage rejects on first read', async () => {
    mockGetPending.mockRejectedValue(new Error('locked'));
    const { result } = renderHook(() => usePendingEmail(true));
    expect(result.current.email).toBeUndefined();
    await act(async () => undefined);
    expect(result.current.email).toBeNull();
    expect(result.current.error?.code).toBe('auth/pending-read-failed');
  });
});

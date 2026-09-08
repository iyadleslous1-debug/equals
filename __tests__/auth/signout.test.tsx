import { act, renderHook } from '@testing-library/react-native';
import { queryClient } from '@/lib/query-client';
import { useSignOut } from '@/features/auth/hooks';
import { clearPendingEmail } from '@/features/auth/pendingEmail';
import { signOut } from '@/lib/auth';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  },
}));

jest.mock('@/lib/auth', () => ({
  signOut: jest.fn(),
  getSession: jest.fn(),
  signUpWithEmail: jest.fn(),
  signInWithEmail: jest.fn(),
  verifyEmailOtp: jest.fn(),
  resendSignupConfirmation: jest.fn(),
}));

jest.mock('@/features/auth/pendingEmail', () => ({
  getPendingEmail: jest.fn(),
  savePendingEmail: jest.fn(),
  clearPendingEmail: jest.fn(),
}));

const mockSignOut = signOut as jest.Mock;
const mockClearPending = clearPendingEmail as jest.Mock;

describe('useSignOut', () => {
  it('clears server session, cached queries and pending email', async () => {
    mockSignOut.mockResolvedValue({ ok: true, data: undefined });
    queryClient.setQueryData(['profiles', 'x'], { cached: true });

    const { result } = renderHook(() => useSignOut());
    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockClearPending).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(['profiles', 'x'])).toBeUndefined();
    expect(result.current.status).toBe('idle');
  });
});

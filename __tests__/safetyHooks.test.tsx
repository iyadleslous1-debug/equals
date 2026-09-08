import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { blockUser, isBlocked, submitReport } from '@/features/safety/api';
import { useIsBlocked, useSafety } from '@/features/safety/hooks';

jest.mock('@/features/safety/api', () => ({
  submitReport: jest.fn(),
  blockUser: jest.fn(),
  unblockUser: jest.fn(),
  isBlocked: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  },
}));

const mockSubmit = submitReport as jest.Mock;
const mockBlock = blockUser as jest.Mock;
const mockIsBlocked = isBlocked as jest.Mock;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useSafety', () => {
  it('exposes pending status mid-flight, then success', async () => {
    let resolve!: (value: { ok: boolean; data?: undefined }) => void;
    mockSubmit.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const { result } = await renderHook(() => useSafety(), { wrapper });
    expect(result.current.status).toBe('idle');
    let submitted: Promise<boolean>;
    await act(async () => {
      submitted = result.current.report('u-9', 'Spam', '');
    });
    expect(result.current.status).toBe('pending');
    await act(async () => {
      resolve({ ok: true, data: undefined });
      await submitted;
    });
    expect(result.current.status).toBe('success');
    expect(result.current.error).toBeNull();
  });

  it('surfaces failures with a retryable error state', async () => {
    mockBlock.mockResolvedValue({ ok: false, error: { code: 'x', message: 'Blocage impossible.' } });
    const { result } = await renderHook(() => useSafety(), { wrapper });
    await act(async () => {
      await result.current.block('u-9');
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Blocage impossible.');
  });

  it('recovers to error state when the api throws (audit S3)', async () => {
    mockSubmit.mockRejectedValue(new Error('store exploded'));
    const { result } = await renderHook(() => useSafety(), { wrapper });
    await act(async () => {
      await result.current.report('u-9', 'Spam', '');
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Signalement impossible. Réessayez.');
  });
});

describe('useIsBlocked', () => {
  it('reflects the server block state', async () => {
    mockIsBlocked.mockResolvedValue({ ok: true, data: true });
    const { result, rerender } = await renderHook(({ id }: { id: string | null }) => useIsBlocked(id), {
      wrapper,
      initialProps: { id: 'u-9' },
    });
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
    mockIsBlocked.mockResolvedValue({ ok: true, data: false });
    await rerender({ id: 'u-8' });
    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});

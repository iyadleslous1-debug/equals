import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppState } from 'react-native';
import type { ReactNode } from 'react';
import { useForegroundRefetch } from '@/hooks/useForegroundRefetch';
import { useSignedUrls } from '@/hooks/useSignedUrls';
import { resolveStorageUrl } from '@/lib/storage-url';

jest.mock('@/lib/storage-url', () => ({
  resolveStorageUrl: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  },
}));

const mockResolve = resolveStorageUrl as jest.Mock;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useForegroundRefetch', () => {
  it('refetches only on foreground transitions and cleans up', async () => {
    const onForeground = jest.fn();
    const { unmount } = await renderHook(() => useForegroundRefetch(onForeground));
    const addEventListener = AppState.addEventListener as jest.Mock;
    expect(addEventListener).toHaveBeenCalledTimes(1);
    const handler = addEventListener.mock.calls[0]?.[1] as (state: string) => void;
    await act(async () => {
      handler('background');
    });
    expect(onForeground).not.toHaveBeenCalled();
    await act(async () => {
      handler('active');
    });
    expect(onForeground).toHaveBeenCalledTimes(1);
    await unmount();
  });
});

describe('useSignedUrls', () => {
  it('resolves bucket paths, passes legacy URLs through, and reports failures', async () => {
    mockResolve.mockImplementation(async (_bucket: string, path: string) =>
      path === 'bad/path.jpg'
        ? { ok: false as const, error: { code: 'x', message: 'nope' } }
        : { ok: true as const, data: `signed:${path}` },
    );
    const rows = [
      { id: 'a', url: 'a/1.jpg' },
      { id: 'b', url: null },
      { id: 'c', url: 'bad/path.jpg' },
    ];
    const { result } = await renderHook(
      () =>
        useSignedUrls(
          'test',
          rows,
          (r) => r.id,
          (r) => r.url,
        ),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.urls).toEqual({ a: 'signed:a/1.jpg' });
    });
    expect(result.current.failedIds).toEqual(['c']);
    expect(typeof result.current.reload).toBe('function');
  });
});

import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { acceptRequest, declineRequest } from '@/features/requests/api';
import { useRespond } from '@/features/requests/hooks';

jest.mock('@/features/requests/api', () => ({
  fetchInbox: jest.fn(),
  acceptRequest: jest.fn(),
  declineRequest: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  },
}));

const mockAccept = acceptRequest as jest.Mock;
const mockDecline = declineRequest as jest.Mock;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useRespond throw-path (audit S3)', () => {
  it('recovers to error state when accept throws', async () => {
    mockAccept.mockRejectedValue(new Error('gone'));
    const { result } = await renderHook(() => useRespond(), { wrapper });
    await act(async () => {
      result.current.accept('r1');
    });
    expect(result.current.error).toBe('Action impossible. Réessayez.');
    expect(result.current.acting).toBe(false);
  });

  it('recovers to error state when decline throws', async () => {
    mockDecline.mockRejectedValue(new Error('gone'));
    const { result } = await renderHook(() => useRespond(), { wrapper });
    await act(async () => {
      result.current.decline('r1');
    });
    expect(result.current.error).toBe('Action impossible. Réessayez.');
  });
});

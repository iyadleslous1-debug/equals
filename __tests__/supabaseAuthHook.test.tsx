import { act, renderHook } from '@testing-library/react-native';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { useSessionStore } from '../store/sessionStore';

type Listener = (event: string, session: unknown) => void;

let listener: Listener | null = null;
const mockUnsubscribe = jest.fn();
const mockGetSession = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: Listener) => {
        listener = cb;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      },
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  listener = null;
  useSessionStore.setState({ session: null });
});

describe('useSupabaseAuth (audit S6)', () => {
  it('mirrors the initial session into the store', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u-1' } });
    await renderHook(() => useSupabaseAuth());
    await act(async () => {});
    expect(useSessionStore.getState().session).toEqual({ user: { id: 'u-1' } });
  });

  it('follows auth-state changes and unsubscribes on unmount', async () => {
    mockGetSession.mockResolvedValue(null);
    const { unmount } = await renderHook(() => useSupabaseAuth());
    await act(async () => {});
    expect(typeof listener).toBe('function');
    await act(async () => {
      listener?.('SIGNED_IN', { user: { id: 'u-2' } });
    });
    expect(useSessionStore.getState().session).toEqual({ user: { id: 'u-2' } });
    await unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});

import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useActivity } from '../hooks/useActivity';

const mockRecordLogin = jest.fn();
const mockTouchActivity = jest.fn();

jest.mock('@/lib/activity', () => ({
  recordLogin: (...args: unknown[]) => mockRecordLogin(...args),
  touchActivity: (...args: unknown[]) => mockTouchActivity(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockRecordLogin.mockResolvedValue({ ok: true, data: { current_streak: 1, longest_streak: 1 } });
  mockTouchActivity.mockResolvedValue(undefined);
});

describe('useActivity (MVP3 retention)', () => {
  it('claims login once per mount, never when signed out', async () => {
    const { rerender, unmount } = await renderHook(({ id }: { id: string | null }) => useActivity(id), {
      initialProps: { id: null as string | null },
    });
    expect(mockRecordLogin).not.toHaveBeenCalled();
    await rerender({ id: 'u-1' });
    expect(mockRecordLogin).toHaveBeenCalledTimes(1);
    await rerender({ id: 'u-1' });
    expect(mockRecordLogin).toHaveBeenCalledTimes(1);
    await unmount();
  });

  it('re-claims on account switch', async () => {
    const { rerender } = await renderHook(({ id }: { id: string | null }) => useActivity(id), {
      initialProps: { id: 'u-1' as string | null },
    });
    expect(mockRecordLogin).toHaveBeenCalledTimes(1);
    await rerender({ id: 'u-2' });
    expect(mockRecordLogin).toHaveBeenCalledTimes(2);
  });

  it('heartbeats on foreground return while signed in, throttled in-app', async () => {
    await renderHook(() => useActivity('u-1'));
    const addEventListener = AppState.addEventListener as jest.Mock;
    const handler = addEventListener.mock.calls[addEventListener.mock.calls.length - 1]?.[1] as (
      state: string,
    ) => void;
    await act(async () => {
      handler('active');
    });
    expect(mockTouchActivity).toHaveBeenCalledTimes(1);
    await act(async () => {
      handler('active');
    });
    expect(mockTouchActivity).toHaveBeenCalledTimes(1);
  });

  it('never heartbeats while signed out', async () => {
    await renderHook(() => useActivity(null));
    const addEventListener = AppState.addEventListener as jest.Mock;
    const handler = addEventListener.mock.calls[addEventListener.mock.calls.length - 1]?.[1] as (
      state: string,
    ) => void;
    await act(async () => {
      handler('active');
    });
    expect(mockTouchActivity).not.toHaveBeenCalled();
  });
});

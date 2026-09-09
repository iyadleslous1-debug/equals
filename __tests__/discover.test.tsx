import { act, renderHook } from '@testing-library/react-native';
import { mapDbError } from '@/features/discover/api';
import { useAct } from '@/features/discover/hooks';

describe('mapDbError', () => {
  it('maps unique violations to a benign already-recorded state', () => {
    expect(mapDbError({ code: '23505', message: 'duplicate key' })).toEqual({
      code: 'discover/already-recorded',
      message: 'Already recorded.',
    });
  });

  it('maps trigger denials to a visible throttle state', () => {
    expect(mapDbError({ code: 'P0001', message: 'rate_limited: too many swipes' })).toEqual({
      code: 'discover/rate-limited',
      message: 'Slow down a bit, then try again.',
    });
  });

  it('falls back to a generic actionable message', () => {
    expect(mapDbError({ code: 'XX000', message: 'boom' })).toEqual({
      code: 'discover/action-failed',
      message: 'Something went wrong. Try again.',
    });
    expect(mapDbError(null)).toEqual({
      code: 'discover/action-failed',
      message: 'Something went wrong. Try again.',
    });
  });
});

describe('useAct', () => {
  it('runs one action at a time and ignores taps while busy', async () => {
    const fn = jest.fn(() => new Promise<string>((resolve) => setTimeout(() => resolve('done'), 50)));
    jest.useFakeTimers();
    try {
      const { result } = await renderHook(() => useAct());
      expect(result.current.acting).toBe(false);
      let first: Promise<string | null>;
      await act(async () => {
        first = result.current.run(fn);
      });
      expect(result.current.acting).toBe(true);
      let second: Promise<string | null>;
      await act(async () => {
        second = result.current.run(fn);
      });
      expect(fn).toHaveBeenCalledTimes(1);
      await act(async () => {
        jest.advanceTimersByTime(100);
        await first!;
        await second!;
      });
      expect(result.current.acting).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });
});

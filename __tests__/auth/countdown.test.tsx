import { act, renderHook } from '@testing-library/react-native';
import { resendLabel, useResendCountdown } from '@/features/auth/useResendCountdown';

jest.useFakeTimers();

describe('resendLabel', () => {
  it('shows the countdown while waiting and the action when ready', async () => {
    expect(resendLabel(47)).toBe('Resend in 47s');
    expect(resendLabel(0)).toBe('Resend code');
  });
});

describe('useResendCountdown', () => {
  it('starts cooling down immediately (no first-frame resend flash)', async () => {
    const { result } = await renderHook(() => useResendCountdown(60));
    expect(result.current.secondsLeft).toBe(60);
    expect(result.current.label).toBe('Resend in 60s');
  });

  it('ticks down each second and stops at zero', async () => {
    const { result } = await renderHook(() => useResendCountdown(60));
    await act(async () => {
      result.current.start(60);
    });
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.secondsLeft).toBe(55);

    await act(async () => {
      jest.advanceTimersByTime(60000);
    });
    expect(result.current.secondsLeft).toBe(0);
  });

  it('restarts from a server-provided retry delay', async () => {
    const { result } = await renderHook(() => useResendCountdown(60));
    await act(async () => {
      result.current.start(42);
    });
    expect(result.current.secondsLeft).toBe(42);
    expect(result.current.label).toBe('Resend in 42s');
  });
});

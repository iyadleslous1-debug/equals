import { act, renderHook } from '@testing-library/react-native';
import { resendLabel, useResendCountdown } from '@/features/auth/useResendCountdown';

jest.useFakeTimers();

describe('resendLabel', () => {
  it('shows the countdown while waiting and the action when ready', () => {
    expect(resendLabel(47)).toBe('Renvoyer dans 47 s');
    expect(resendLabel(0)).toBe('Renvoyer le code');
  });
});

describe('useResendCountdown', () => {
  it('starts cooling down immediately (no first-frame resend flash)', () => {
    const { result } = renderHook(() => useResendCountdown(60));
    expect(result.current.secondsLeft).toBe(60);
    expect(result.current.label).toBe('Renvoyer dans 60 s');
  });

  it('ticks down each second and stops at zero', () => {
    const { result } = renderHook(() => useResendCountdown(60));
    act(() => {
      result.current.start(60);
    });
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.secondsLeft).toBe(55);

    act(() => {
      jest.advanceTimersByTime(60000);
    });
    expect(result.current.secondsLeft).toBe(0);
  });

  it('restarts from a server-provided retry delay', () => {
    const { result } = renderHook(() => useResendCountdown(60));
    act(() => {
      result.current.start(42);
    });
    expect(result.current.secondsLeft).toBe(42);
    expect(result.current.label).toBe('Renvoyer dans 42 s');
  });
});

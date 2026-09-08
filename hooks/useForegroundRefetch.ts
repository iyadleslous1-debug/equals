import { useEffect } from 'react';
import { AppState } from 'react-native';

/**
 * Re-run `onForeground` every time the app returns to the foreground.
 * Single home for the AppState-refetch pattern used by deck/requests/chat
 * screens (audit S1) — same cleanup semantics everywhere.
 */
export function useForegroundRefetch(onForeground: () => void): void {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') onForeground();
    });
    return () => subscription.remove();
  }, [onForeground]);
}

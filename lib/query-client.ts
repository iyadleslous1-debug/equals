/**
 * Shared React Query client + offline resilience.
 *
 * Retry/backoff: React Query retries twice with exponential backoff
 * (`min(1000 * 2^attempt, 30s)` built-in) — transient Supabase blips and
 * flaky DZ mobile data recover without user action. Mutations never retry
 * (no duplicate messages/requests). `withRetry` in `lib/result.ts` covers the
 * non-Query paths (auth sends) with the same philosophy.
 *
 * Offline: NetInfo drives `onlineManager`, so queries pause when the device
 * loses connectivity and refetch on reconnect instead of erroring in a loop.
 *
 * Conventions for future features:
 * - Query keys are arrays starting with the table name: `['profiles', userId]`.
 * - `staleTime` 60s keeps discovery lists snappy without hammering Supabase.
 */
import NetInfo from '@react-native-community/netinfo';
import { onlineManager, QueryClient } from '@tanstack/react-query';
import { LIST_STALE_TIME_MS } from '@/constants/app';

onlineManager.setEventListener((setOnline) => {
  const unsubscribe = NetInfo.addEventListener((state) => {
    setOnline(state.isConnected === true);
  });
  return unsubscribe;
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: LIST_STALE_TIME_MS,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

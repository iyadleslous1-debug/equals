/**
 * Root layout — providers only. No feature UI lives here.
 * Feature screens will be added as route groups under `app/` in MVP1.
 *
 * Startup sequence: env validation already ran at import (`lib/config.ts`
 * throws on missing vars) → here we apply log verbosity, warn about optional
 * dev vars, then mount the crash boundary around everything.
 */
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { config, reportOptionalEnv } from '../lib/config';
import { setMinLevel } from '../lib/logger';
import { queryClient } from '../lib/query-client';
import '../global.css';

export default function RootLayout(): React.JSX.Element {
  useSupabaseAuth();

  useEffect(() => {
    setMinLevel(config.logLevel);
    reportOptionalEnv();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ToastProvider } from '../components/Toast';
import { COLORS } from '../constants/theme';
import { useActivity } from '../hooks/useActivity';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { config, reportOptionalEnv } from '../lib/config';
import { setMinLevel } from '../lib/logger';
import { queryClient } from '../lib/query-client';
import { useSessionStore } from '../store/sessionStore';
import '../global.css';

export default function RootLayout(): React.JSX.Element {
  useSupabaseAuth();
  const userId = useSessionStore((s) => s.session?.user?.id);
  useActivity(userId);

  useEffect(() => {
    setMinLevel(config.logLevel);
    reportOptionalEnv();
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <StatusBar style="auto" />
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                animationDuration: 400,
                gestureEnabled: true,
                gestureDirection: 'horizontal',
                contentStyle: { backgroundColor: COLORS.void },
              }}
            >
              <Stack.Screen
                name="survey"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen name="profile/[id]" options={{ animation: 'slide_from_right' }} />
            </Stack>
          </ToastProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

/**
 * Global crash boundary — the last line of defence for render failures.
 *
 * Mounted once in `app/_layout.tsx`. A crashing subtree shows the fallback
 * (retry + report ID) instead of a dead app. Reports flow through
 * `lib/reporting.ts`, so Sentry arrives with one env change, not a refactor.
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { reportError } from '../lib/reporting';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

function Fallback({ error, onRetry }: { error: Error; onRetry: () => void }): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-void px-8">
      <Text className="text-4xl">🛸</Text>
      <Text className="mt-4 text-center text-xl font-bold text-white">Something broke on our side.</Text>
      <Text className="mt-2 text-center text-sm text-white/60">
        Your data is safe. Restart this screen — and if it keeps happening, contact support.
      </Text>
      {__DEV__ ? (
        <Text className="mt-3 text-xs text-white/40" numberOfLines={4}>
          {error.message}
        </Text>
      ) : null}
      <Pressable onPress={onRetry} className="mt-6 rounded-2xl bg-white px-6 py-3">
        <Text className="font-bold text-void">Try again</Text>
      </Pressable>
    </View>
  );
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    reportError(error, { componentStack: info.componentStack ?? undefined }, true);
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (this.state.error !== null) {
      return <Fallback error={this.state.error} onRetry={this.reset} />;
    }
    return this.props.children;
  }
}

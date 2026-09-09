/**
 * Global crash boundary — the last line of defence for render failures.
 *
 * Mounted once in `app/_layout.tsx`. A crashing subtree shows the fallback
 * (retry + report ID) instead of a dead app. Reports flow through
 * `lib/reporting.ts`, so Sentry arrives with one env change, not a refactor.
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { reportError } from '../lib/reporting';
import { Button } from './Button';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

function Fallback({ error, onRetry }: { error: Error; onRetry: () => void }): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-void px-8">
      <Ionicons name="alert-circle" size={48} color={COLORS.muted} />
      <Text className="mt-4 text-center text-xl font-bold text-text">Something went wrong.</Text>
      <Text className="mt-2 text-center text-sm text-muted">
        Your data is safe. Try again — if this keeps happening, contact support.
      </Text>
      {__DEV__ ? (
        <Text className="mt-3 text-xs text-faint" numberOfLines={4}>
          {error.message}
        </Text>
      ) : null}
      <View className="mt-6">
        <Button title="Retry" onPress={onRetry} testID="error-boundary-retry" />
      </View>
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

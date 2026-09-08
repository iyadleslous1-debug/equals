import { Text, View } from 'react-native';
import { Button } from './Button';

export interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  title?: string;
  retryTitle?: string;
  testID?: string;
}

export function ErrorState({
  message,
  onRetry,
  title = 'Something went wrong',
  retryTitle = 'Try again',
  testID,
}: ErrorStateProps): React.JSX.Element {
  return (
    <View testID={testID} className="flex-1 items-center justify-center px-8">
      <Text className="text-center text-lg font-bold text-text">{title}</Text>
      <Text className="mt-2 text-center text-sm text-muted">{message}</Text>
      <View className="mt-6">
        <Button
          title={retryTitle}
          onPress={onRetry}
          variant="secondary"
          testID={testID ? `${testID}-retry` : undefined}
        />
      </View>
    </View>
  );
}

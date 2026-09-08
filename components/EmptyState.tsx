import { Text, View } from 'react-native';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  message: string;
  actionTitle?: string;
  onAction?: () => void;
  testID?: string;
}

export function EmptyState({
  title,
  message,
  actionTitle,
  onAction,
  testID,
}: EmptyStateProps): React.JSX.Element {
  return (
    <View testID={testID} className="flex-1 items-center justify-center px-8">
      <Text className="text-center text-lg font-bold text-text">{title}</Text>
      <Text className="mt-2 text-center text-sm text-muted">{message}</Text>
      {actionTitle && onAction ? (
        <View className="mt-6">
          <Button
            title={actionTitle}
            onPress={onAction}
            variant="secondary"
            testID={testID ? `${testID}-action` : undefined}
          />
        </View>
      ) : null}
    </View>
  );
}

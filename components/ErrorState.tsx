import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { COLORS } from '../constants/theme';

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
  title = 'Something went wrong.',
  retryTitle = 'Retry',
  testID,
}: ErrorStateProps): React.JSX.Element {
  return (
    <View testID={testID} className="flex-1 items-center justify-center px-8">
      <Ionicons name="alert-circle" size={48} color={COLORS.destructive} accessible={false} />
      <Text
        style={{ marginTop: 24, textAlign: 'center', fontSize: 20, fontWeight: '600', color: COLORS.text }}
      >
        {title}
      </Text>
      <Text style={{ marginTop: 8, textAlign: 'center', fontSize: 15, color: COLORS.muted, lineHeight: 22 }}>
        {message}
      </Text>
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

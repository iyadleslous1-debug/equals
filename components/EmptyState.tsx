import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { COLORS } from '../constants/theme';

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionTitle?: string;
  onAction?: () => void;
  testID?: string;
}

export function EmptyState({
  icon,
  title,
  message,
  actionTitle,
  onAction,
  testID,
}: EmptyStateProps): React.JSX.Element {
  return (
    <View testID={testID} className="flex-1 items-center justify-center px-8">
      {icon ? <Ionicons name={icon} size={48} color={COLORS.border} accessible={false} /> : null}
      <Text
        style={{ marginTop: 24, textAlign: 'center', fontSize: 20, fontWeight: '600', color: COLORS.text }}
      >
        {title}
      </Text>
      <Text style={{ marginTop: 8, textAlign: 'center', fontSize: 15, color: COLORS.muted, lineHeight: 22 }}>
        {message}
      </Text>
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

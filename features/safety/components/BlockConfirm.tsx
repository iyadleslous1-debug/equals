import { Text, View } from 'react-native';
import { Button } from '@/components/Button';

export interface BlockConfirmProps {
  userName: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
  testID?: string;
}

export function BlockConfirm({ userName, onConfirm, onCancel, pending = false, testID }: BlockConfirmProps) {
  const t = (id: string): string => (testID ? `${testID}-${id}` : '');
  return (
    <View testID={testID} className="gap-3">
      <Text className="text-lg font-bold text-text">Block {userName}?</Text>
      <Text className="text-sm text-muted">
        {userName} won’t be able to see you or message you anymore, and your conversations will be locked. You
        can unblock them later.
      </Text>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button title="Cancel" onPress={onCancel} variant="secondary" testID={t('cancel')} />
        </View>
        <View className="flex-1">
          <Button
            title="Block"
            onPress={onConfirm}
            loading={pending}
            variant="destructive"
            testID={t('confirm')}
          />
        </View>
      </View>
    </View>
  );
}

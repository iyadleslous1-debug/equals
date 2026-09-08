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
      <Text className="text-lg font-bold text-text">Bloquer {userName} ?</Text>
      <Text className="text-sm text-muted">
        {userName} ne pourra plus vous voir ni vous écrire, et vos conversations seront verrouillées. Vous
        pourrez lever le blocage plus tard.
      </Text>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button title="Annuler" onPress={onCancel} variant="secondary" testID={t('cancel')} />
        </View>
        <View className="flex-1">
          <Button
            title="Bloquer"
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

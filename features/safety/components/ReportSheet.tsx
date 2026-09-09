import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { REPORT_REASONS } from '../api';

export interface ReportSheetProps {
  userName: string;
  onSubmit: (input: { reason: string; description: string }) => void;
  onClose: () => void;
  pending?: boolean;
  testID?: string;
}

export function ReportSheet({ userName, onSubmit, onClose, pending = false, testID }: ReportSheetProps) {
  const [reason, setReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const t = (id: string): string => (testID ? `${testID}-${id}` : '');

  return (
    <View testID={testID} className="gap-3">
      <Text className="text-lg font-bold text-text">Report {userName}</Text>
      <Text className="text-sm text-muted">
        A report can’t be undone or edited after sending. Our team will review it.
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {REPORT_REASONS.map((option) => (
          <Pressable
            key={option}
            onPress={() => setReason(option)}
            accessibilityRole="button"
            accessibilityLabel={`${option}${reason === option ? ', selected' : ''}`}
            accessibilityState={{ selected: reason === option }}
            className={`rounded-full border px-4 py-2 ${
              reason === option ? 'border-primary bg-primary' : 'border-border bg-ink'
            }`}
          >
            <Text className={`text-sm font-semibold ${reason === option ? 'text-onPrimary' : 'text-muted'}`}>
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
      <Input
        label="Details (optional)"
        hint="1000 characters max"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
        maxLength={1000}
        testID={t('description')}
      />
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button title="Cancel" onPress={onClose} variant="secondary" testID={t('cancel')} />
        </View>
        <View className="flex-1">
          <Button
            title="Send"
            onPress={() => {
              if (reason) onSubmit({ reason, description });
            }}
            disabled={reason === null}
            loading={pending}
            variant="destructive"
            testID={t('confirm')}
          />
        </View>
      </View>
    </View>
  );
}

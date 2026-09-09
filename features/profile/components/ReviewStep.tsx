import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { isValidWilaya, wilayaLabel } from '@/constants/wilayas';
import type { ProfileInput } from '@/lib/validation/schemas';

export interface ReviewStepProps {
  fields: Partial<ProfileInput>;
  photoCount: number;
  pending: boolean;
  serverError: string | null;
  onBack: () => void;
  onDone: () => void;
  testID?: string;
}

export function ReviewStep({
  fields,
  photoCount,
  pending,
  serverError,
  onBack,
  onDone,
  testID,
}: ReviewStepProps) {
  const t = (id: string): string => (testID ? `${testID}-${id}` : '');
  const rows: [string, string][] = [
    ['Name', fields.display_name ?? '—'],
    ['Age', fields.age !== undefined ? String(fields.age) : '—'],
    ['Gender', fields.gender === 'male' ? 'Man' : fields.gender === 'female' ? 'Woman' : '—'],
    [
      'Wilaya',
      fields.wilaya !== undefined && isValidWilaya(fields.wilaya) ? wilayaLabel(fields.wilaya) : '—',
    ],
    ['Bio', fields.bio ?? '—'],
    ['Photos', `${photoCount}/6`],
  ];
  return (
    <View testID={testID} className="gap-4">
      <Text className="text-sm text-muted">Review your profile before you start discovering.</Text>
      <View className="rounded-2xl border border-border bg-ink p-4">
        {rows.map(([label, value]) => (
          <View key={label} className="flex-row justify-between py-2">
            <Text className="text-sm text-muted">{label}</Text>
            <Text className="max-w-[60%] text-right text-sm font-semibold text-text" numberOfLines={2}>
              {value}
            </Text>
          </View>
        ))}
      </View>
      {serverError ? (
        <Text testID={t('server-error')} className="text-sm text-destructive">
          {serverError}
        </Text>
      ) : null}
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button title="Back" onPress={onBack} variant="secondary" testID={t('back')} />
        </View>
        <View className="flex-1">
          <Button title="Finish" onPress={onDone} loading={pending} testID={t('done')} />
        </View>
      </View>
    </View>
  );
}

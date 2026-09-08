import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { labelFor } from './WilayaPicker';
import { WILAYAS } from '@/constants/wilayas';
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
    ['Nom', fields.display_name ?? '—'],
    ['Âge', fields.age !== undefined ? String(fields.age) : '—'],
    ['Genre', fields.gender === 'male' ? 'Homme' : fields.gender === 'female' ? 'Femme' : '—'],
    [
      'Wilaya',
      fields.wilaya !== undefined && WILAYAS.some((w) => w.code === fields.wilaya)
        ? labelFor(fields.wilaya)
        : '—',
    ],
    ['Bio', fields.bio ?? '—'],
    ['Photos', `${photoCount}/6`],
  ];
  return (
    <View testID={testID} className="gap-4">
      <Text className="text-sm text-muted">Vérifiez votre profil avant de découvrir.</Text>
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
          <Button title="Retour" onPress={onBack} variant="secondary" testID={t('back')} />
        </View>
        <View className="flex-1">
          <Button title="Terminer" onPress={onDone} loading={pending} testID={t('done')} />
        </View>
      </View>
    </View>
  );
}

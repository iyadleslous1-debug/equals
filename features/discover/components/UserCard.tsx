import { memo } from 'react';
import { Image, Text, View } from 'react-native';
import { wilayaLabel } from '@/constants/wilayas';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import type { DeckProfile } from '../api';

export interface UserCardProps {
  profile: DeckProfile;
  photoUrl: string | null;
  acting: boolean;
  onRequest: () => void;
  onSkip: () => void;
  onMore?: () => void;
  testID?: string;
}

export const UserCard = memo(function UserCard({
  profile,
  photoUrl,
  acting,
  onRequest,
  onSkip,
  onMore,
  testID,
}: UserCardProps) {
  const t = (id: string): string => (testID ? `${testID}-${id}` : '');
  return (
    <View testID={testID} className="overflow-hidden rounded-2xl border border-border bg-ink">
      {photoUrl ? (
        <Image testID={t('photo')} source={{ uri: photoUrl }} className="h-96 w-full" resizeMode="cover" />
      ) : (
        <View testID={t('photo-missing')} className="h-96 w-full items-center justify-center bg-elevated">
          <Text className="text-5xl font-bold text-faint">
            {(profile.display_name[0] ?? '?').toUpperCase()}
          </Text>
        </View>
      )}
      <View className="p-4">
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-xl font-bold text-text">
            {profile.display_name}, {profile.age}
          </Text>
          {onMore ? (
            <IconButton
              name="ellipsis-horizontal"
              label="Plus d’options"
              onPress={onMore}
              testID={t('more')}
            />
          ) : null}
        </View>
        <Text className="mt-1 text-sm text-secondary">{wilayaLabel(profile.wilaya)}</Text>
        {profile.bio ? (
          <Text className="mt-2 text-sm text-muted" numberOfLines={4}>
            {profile.bio}
          </Text>
        ) : null}
        <View className="mt-4 flex-row gap-2">
          <View className="flex-1">
            <Button
              title="Passer"
              onPress={onSkip}
              disabled={acting}
              variant="secondary"
              testID={t('skip')}
            />
          </View>
          <View className="flex-1">
            <Button title="Demander" onPress={onRequest} loading={acting} testID={t('request')} />
          </View>
        </View>
      </View>
    </View>
  );
});

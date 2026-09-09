import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { wilayaLabel } from '@/constants/wilayas';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { COLORS, ELEVATION } from '@/constants/theme';
import { compatibilityBand } from '@/lib/compatibility';
import type { DeckProfile } from '../api';

export interface UserCardProps {
  profile: DeckProfile;
  photoUrl: string | null;
  acting: boolean;
  compat?: number | null;
  onRequest: () => void;
  onSkip: () => void;
  onMore?: () => void;
  onOpenProfile?: () => void;
  testID?: string;
}

export const UserCard = memo(function UserCard({
  profile,
  photoUrl,
  acting,
  compat = null,
  onRequest,
  onSkip,
  onMore,
  onOpenProfile,
  testID,
}: UserCardProps) {
  const t = (id: string): string => (testID ? `${testID}-${id}` : '');
  const band = compatibilityBand(compat);
  const photo = photoUrl ? (
    <Image
      testID={t('photo')}
      source={{ uri: photoUrl }}
      style={{ width: '100%', height: 384 }}
      contentFit="cover"
      transition={300}
    />
  ) : (
    <View
      testID={t('photo-missing')}
      style={{
        width: '100%',
        height: 384,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.elevated,
      }}
    >
      <Text style={{ fontSize: 120, fontWeight: '700', color: COLORS.primary, opacity: 0.3 }}>
        {(profile.display_name[0] ?? '?').toUpperCase()}
      </Text>
    </View>
  );
  return (
    <View
      testID={testID}
      style={{
        overflow: 'hidden',
        borderRadius: 24,
        backgroundColor: COLORS.ink,
        shadowColor: ELEVATION.card.ios.shadowColor,
        shadowOffset: ELEVATION.card.ios.shadowOffset,
        shadowOpacity: ELEVATION.card.ios.shadowOpacity,
        shadowRadius: ELEVATION.card.ios.shadowRadius,
        elevation: ELEVATION.card.android,
      }}
    >
      <View>
        {onOpenProfile ? (
          <Pressable
            testID={t('open')}
            onPress={onOpenProfile}
            accessibilityRole="button"
            accessibilityLabel={`View ${profile.display_name}'s full profile`}
          >
            {photo}
          </Pressable>
        ) : (
          photo
        )}
        <LinearGradient
          colors={['transparent', COLORS.ink]}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' }}
          pointerEvents="none"
        />
      </View>
      <View style={{ padding: 24 }}>
        <View className="flex-row items-center justify-between">
          <Text style={{ flex: 1, fontSize: 28, fontWeight: '700', color: COLORS.text }}>
            {profile.display_name}, {profile.age}
          </Text>
          {onMore ? (
            <IconButton name="ellipsis-horizontal" label="More options" onPress={onMore} testID={t('more')} />
          ) : null}
        </View>
        <Text style={{ marginTop: 6, fontSize: 15, color: COLORS.muted }}>{wilayaLabel(profile.wilaya)}</Text>
        {band ? (
          <View style={{ marginTop: 16, alignSelf: 'flex-start' }}>
            <Badge
              label={band}
              variant={band === 'Great match' ? 'success' : 'warning'}
              testID={t('compat')}
            />
          </View>
        ) : null}
        {profile.bio ? (
          <Text style={{ marginTop: 12, fontSize: 15, color: COLORS.text, lineHeight: 22 }} numberOfLines={4}>
            {profile.bio}
          </Text>
        ) : null}
        <View className="mt-4 flex-row gap-2">
          <View className="flex-1">
            <Button title="Pass" onPress={onSkip} disabled={acting} variant="secondary" testID={t('skip')} />
          </View>
          <View className="flex-1">
            <Button title="Request" onPress={onRequest} loading={acting} testID={t('request')} />
          </View>
        </View>
      </View>
    </View>
  );
});

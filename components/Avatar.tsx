import { useState } from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { COLORS } from '../constants/theme';

export interface AvatarProps {
  name: string;
  uri?: string;
  size?: number;
  testID?: string;
}

function initialsOf(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return parts === '' ? '?' : parts;
}

export function Avatar({ name, uri, size = 48, testID }: AvatarProps): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  const showPhoto = uri !== undefined && !failed;
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={name === '' ? 'Profile photo' : name}
      className="items-center justify-center overflow-hidden rounded-full bg-elevated"
      style={{ width: size, height: size }}
    >
      {showPhoto ? (
        <Image
          testID={testID ? `${testID}-image` : undefined}
          accessible={false}
          source={{ uri }}
          onError={() => setFailed(true)}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <LinearGradient
          colors={[COLORS.secondary, COLORS.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: size * 0.4, fontWeight: '600', color: COLORS.onPrimary }}>
            {initialsOf(name)}
          </Text>
        </LinearGradient>
      )}
    </View>
  );
}

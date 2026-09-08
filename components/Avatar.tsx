import { useState } from 'react';
import { Image, Text, View } from 'react-native';

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
      accessibilityLabel={name === '' ? 'Photo de profil' : name}
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
        />
      ) : (
        <Text className="text-base font-bold text-muted">{initialsOf(name)}</Text>
      )}
    </View>
  );
}

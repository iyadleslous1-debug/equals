import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { HIT_SLOP, ICON_SIZE, COLORS } from '../constants/theme';

export interface IconButtonProps {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
  testID?: string;
}

export function IconButton({
  name,
  label,
  onPress,
  size = ICON_SIZE.md,
  disabled = false,
  testID,
}: IconButtonProps): React.JSX.Element {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      hitSlop={HIT_SLOP.slop}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      className={disabled ? 'opacity-40' : ''}
    >
      <Ionicons name={name} size={size} color={COLORS.text} />
    </Pressable>
  );
}

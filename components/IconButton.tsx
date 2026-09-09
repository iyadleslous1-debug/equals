/* eslint-disable react-hooks/immutability -- reanimated shared-value mutation is the animation API */
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { HIT_SLOP, ICON_SIZE, COLORS } from '../constants/theme';
import { SPRINGS } from '../lib/animation';
import { haptics } from '../lib/haptics';

export interface IconButtonProps {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function IconButton({
  name,
  label,
  onPress,
  size = ICON_SIZE.md,
  disabled = false,
  testID,
}: IconButtonProps): React.JSX.Element {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.9, { damping: 20, stiffness: 400 });
        void haptics.light();
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRINGS.spring);
      }}
      disabled={disabled}
      hitSlop={HIT_SLOP.slop}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[animatedStyle, { opacity: disabled ? 0.4 : 1 }]}
    >
      <Ionicons name={name} size={size} color={COLORS.text} />
    </AnimatedPressable>
  );
}

/* eslint-disable react-hooks/immutability -- reanimated shared-value mutation is the animation API */
import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { COLORS, HIT_SLOP } from '../constants/theme';
import { SPRINGS } from '../lib/animation';
import { haptics } from '../lib/haptics';

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  multiSelect?: boolean;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Chip({
  label,
  selected,
  onPress,
  multiSelect = false,
  testID,
}: ChipProps): React.JSX.Element {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const backgroundColor = !selected ? COLORS.ink : multiSelect ? COLORS.primaryTint : COLORS.primary;
  const borderColor = !selected ? COLORS.border : multiSelect ? COLORS.primary : 'transparent';
  const textColor = !selected ? COLORS.muted : multiSelect ? COLORS.primary : COLORS.onPrimary;

  return (
    <AnimatedPressable
      testID={testID}
      onPress={() => {
        void haptics.selection();
        onPress();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.95, { damping: 20, stiffness: 400 });
        void haptics.light();
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRINGS.spring);
      }}
      hitSlop={HIT_SLOP.slop}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[
        animatedStyle,
        {
          backgroundColor,
          borderWidth: 1,
          borderColor,
          borderRadius: 20,
          height: 40,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      {multiSelect && selected ? <Ionicons name="checkmark" size={16} color={COLORS.primary} /> : null}
      <Text style={{ color: textColor, fontSize: 15, fontWeight: '500' }}>{label}</Text>
    </AnimatedPressable>
  );
}

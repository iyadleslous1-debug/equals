/* eslint-disable react-hooks/immutability -- reanimated shared-value mutation is the animation API */
import { ActivityIndicator, Pressable, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { COLORS } from '../constants/theme';
import { SPRINGS } from '../lib/animation';
import { haptics } from '../lib/haptics';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'large' | 'medium' | 'small';
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

const HEIGHT = { large: 52, medium: 44, small: 36 } as const;

function colors(
  variant: NonNullable<ButtonProps['variant']>,
  inactive: boolean,
): {
  bg: string;
  text: string;
  border?: string;
} {
  if (inactive) return { bg: COLORS.border, text: COLORS.muted };
  switch (variant) {
    case 'primary':
      return { bg: COLORS.primary, text: COLORS.onPrimary };
    case 'secondary':
      return { bg: 'transparent', text: COLORS.secondary, border: COLORS.secondary };
    case 'ghost':
      return { bg: 'transparent', text: COLORS.secondary };
    case 'destructive':
      return { bg: COLORS.destructive, text: COLORS.onDestructive };
  }
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'large',
  loading = false,
  disabled = false,
  testID,
}: ButtonProps): React.JSX.Element {
  const inactive = loading || disabled;
  const palette = colors(variant, inactive);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 20, stiffness: 400 });
        void haptics.light();
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRINGS.spring);
      }}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[
        animatedStyle,
        {
          backgroundColor: palette.bg,
          height: HEIGHT[size],
          borderRadius: size === 'large' ? 16 : 12,
          paddingHorizontal: 16,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          borderWidth: palette.border ? 1.5 : 0,
          borderColor: palette.border,
          opacity: disabled && !loading ? 0.6 : 1,
        },
      ]}
    >
      {/* Fixed-width spinner slot: identical width loading or not. */}
      <Animated.View style={{ width: 20, alignItems: 'center', marginRight: 8 }}>
        {loading ? (
          <ActivityIndicator
            testID={testID ? `${testID}-loading` : undefined}
            color={palette.text}
            size="small"
          />
        ) : null}
      </Animated.View>
      <Text numberOfLines={1} style={{ color: palette.text, fontSize: 17, fontWeight: '600' }}>
        {title}
      </Text>
    </AnimatedPressable>
  );
}

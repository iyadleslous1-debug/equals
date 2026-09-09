import { forwardRef, useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { HIT_SLOP } from '../constants/theme';
import { haptics } from '../lib/haptics';

export interface FieldError {
  field: string;
  message: string;
}

export interface FormErrorSummaryProps {
  errors: FieldError[];
  /** Called with the field key so the screen can move focus to it. */
  onSelect: (field: string) => void;
  testID?: string;
}

export const FormErrorSummary = forwardRef<View, FormErrorSummaryProps>(function FormErrorSummary(
  { errors, onSelect, testID },
  ref,
) {
  const translateX = useSharedValue(0);
  const key = errors.map((item) => item.field).join(',');
  const mounted = useRef(false);
  useEffect(() => {
    // Skip the mount run (and the empty state): shake only on new errors.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (key === '') return;
    translateX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-5, { duration: 50 }),
      withTiming(5, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
    void haptics.error();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  if (errors.length === 0) return null;
  return (
    <Animated.View
      ref={ref}
      testID={testID}
      accessible
      accessibilityRole="alert"
      style={animatedStyle}
      className="rounded-xl border border-destructive bg-ink p-4"
    >
      <Text className="text-sm font-bold text-text">Please fix:</Text>
      {errors.map((item) => (
        <Pressable
          key={item.field}
          testID={testID ? `${testID}-${item.field}` : undefined}
          onPress={() => onSelect(item.field)}
          hitSlop={HIT_SLOP.slop}
          accessibilityRole="button"
          accessibilityLabel={`${item.message}. Go to field.`}
          className="min-h-[44px] justify-center"
        >
          <Text className="text-sm text-destructive underline">{item.message}</Text>
        </Pressable>
      ))}
    </Animated.View>
  );
});

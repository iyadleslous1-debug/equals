import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { DURATIONS } from '../lib/animation';

export interface RevealProps {
  /** Stagger index: delay = index × 100ms (auth form cascade). */
  index?: number;
  testID?: string;
  children: ReactNode;
}

/** Mount reveal: fade + 50pt rise. Instant when reduced motion is on. */
export function Reveal({ index = 0, testID, children }: RevealProps): React.JSX.Element {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }
    opacity.value = withDelay(index * 100, withTiming(1, { duration: DURATIONS.slow }));
    translateY.value = withDelay(index * 100, withTiming(0, { duration: DURATIONS.slow }));
  }, [index, opacity, translateY, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View testID={testID} style={animatedStyle}>
      {children}
    </Animated.View>
  );
}

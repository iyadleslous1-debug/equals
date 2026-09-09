/* eslint-disable react-hooks/immutability -- reanimated shared values + worklet closures are the gesture API */
import type { ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SPRINGS } from '@/lib/animation';
import { haptics } from '@/lib/haptics';

const SWIPE_THRESHOLD = 100;

export interface SwipeableCardProps {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  testID?: string;
  children: ReactNode;
}

/**
 * Tinder-style pan wrapper: follows the finger with tilt, springs back under
 * threshold, flies off past it. Tap passthrough untouched — inner buttons
 * keep working. Remount per card (key by profile id) resets gesture state.
 */
export function SwipeableCard({ onSwipeLeft, onSwipeRight, testID, children }: SwipeableCardProps) {
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const crossed = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const gesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.3;
      rotate.value = (event.translationX / width) * 10;
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD && !crossed.value) {
        crossed.value = true;
        runOnJS(haptics.medium)();
      }
    })
    .onEnd((event) => {
      crossed.value = false;
      // Spring back in every case: the deck advances (unmount) on success,
      // and a gated/failed action must never strand the card off-screen.
      translateX.value = withSpring(0, SPRINGS.spring);
      translateY.value = withSpring(0, SPRINGS.spring);
      rotate.value = withSpring(0, SPRINGS.spring);
      if (event.translationX > SWIPE_THRESHOLD) {
        runOnJS(onSwipeRight)();
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        runOnJS(onSwipeLeft)();
      }
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View testID={testID} style={animatedStyle}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

/* eslint-disable react-hooks/immutability -- reanimated shared-value mutation is the animation API */
import { Modal as RNModal, Pressable, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { useEffect } from 'react';
import { IconButton } from './IconButton';
import { COLORS } from '../constants/theme';
import { DURATIONS } from '../lib/animation';
import { haptics } from '../lib/haptics';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  testID?: string;
}

/** Bottom sheet — spring slide-up over a blurring scrim, drag to dismiss. */
export function Sheet({ visible, onClose, title, children, testID }: SheetProps): React.JSX.Element {
  const translateY = useSharedValue(1000);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 25, stiffness: 200 });
      opacity.value = withTiming(1, { duration: DURATIONS.normal });
      void haptics.medium();
    } else {
      translateY.value = withTiming(1000, { duration: DURATIONS.normal });
      opacity.value = withTiming(0, { duration: DURATIONS.normal });
    }
  }, [visible, translateY, opacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const drag = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, { damping: 25, stiffness: 200 });
      }
    });

  if (!visible) return <></>;

  return (
    <RNModal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View testID={testID} className="flex-1 justify-end">
        <Animated.View style={[{ ...StyleSheetAbsoluteFill }, scrimStyle]}>
          <Pressable
            testID={testID ? `${testID}-scrim` : undefined}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{ flex: 1 }}
          >
            <BlurView intensity={10} style={{ flex: 1 }}>
              <View style={{ flex: 1, backgroundColor: COLORS.scrim }} />
            </BlurView>
          </Pressable>
        </Animated.View>
        <GestureDetector gesture={drag}>
          <Animated.View
            accessible
            accessibilityLabel={title}
            accessibilityViewIsModal
            style={[
              sheetStyle,
              {
                backgroundColor: COLORS.elevated,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingHorizontal: 24,
                paddingBottom: 34,
                maxHeight: '80%',
              },
            ]}
          >
            <View
              style={{
                width: 36,
                height: 4,
                backgroundColor: COLORS.border,
                borderRadius: 2,
                alignSelf: 'center',
                marginTop: 8,
                marginBottom: 16,
              }}
            />
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-text">{title}</Text>
              <IconButton
                name="close"
                label={`Close ${title}`}
                onPress={onClose}
                testID={testID ? `${testID}-close` : undefined}
              />
            </View>
            {children}
          </Animated.View>
        </GestureDetector>
      </View>
    </RNModal>
  );
}

const StyleSheetAbsoluteFill = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
} as const;

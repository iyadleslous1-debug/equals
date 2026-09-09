import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ELEVATION, HIT_SLOP } from '../constants/theme';
import { DURATIONS } from '../lib/animation';
import { haptics } from '../lib/haptics';

interface ToastOptions {
  duration?: number;
}

interface ToastContextValue {
  show: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => undefined });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const DEFAULT_DURATION = 4000;

function ToastMessage({
  message,
  exiting,
  onDismiss,
}: {
  message: string;
  exiting: boolean;
  onDismiss: () => void;
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (exiting) {
      translateY.value = withTiming(100, { duration: DURATIONS.normal });
      opacity.value = withTiming(0, { duration: DURATIONS.normal });
      return;
    }
    translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 300 });
    void haptics.light();
  }, [exiting, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      testID="toast-message"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        animatedStyle,
        {
          position: 'absolute',
          bottom: 100,
          left: 24,
          right: 24,
          backgroundColor: COLORS.elevated,
          borderRadius: 12,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: ELEVATION.modal.ios.shadowColor,
          shadowOffset: ELEVATION.modal.ios.shadowOffset,
          shadowOpacity: ELEVATION.modal.ios.shadowOpacity,
          shadowRadius: ELEVATION.modal.ios.shadowRadius,
          elevation: ELEVATION.modal.android,
        },
      ]}
    >
      <Text numberOfLines={2} style={{ flex: 1, fontSize: 15, fontWeight: '500', color: COLORS.text }}>
        {message}
      </Text>
      <Pressable
        testID="toast-dismiss"
        onPress={onDismiss}
        hitSlop={HIT_SLOP.slop}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
      >
        <Ionicons name="close" size={20} color={COLORS.muted} />
      </Pressable>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [message, setMessage] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    // Match the exit slide before unmounting.
    setExiting(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setMessage(null);
      setExiting(false);
    }, DURATIONS.normal);
  }, []);

  const show = useCallback(
    (next: string, options?: ToastOptions) => {
      if (timer.current !== null) clearTimeout(timer.current);
      setExiting(false);
      setMessage(next);
      timer.current = setTimeout(dismiss, options?.duration ?? DEFAULT_DURATION);
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {message !== null ? <ToastMessage message={message} exiting={exiting} onDismiss={dismiss} /> : null}
    </ToastContext.Provider>
  );
}

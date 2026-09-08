import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { HIT_SLOP } from '../constants/theme';

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

const DEFAULT_DURATION = 3000;

export function ToastProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setMessage(null);
  }, []);

  const show = useCallback(
    (next: string, options?: ToastOptions) => {
      if (timer.current !== null) clearTimeout(timer.current);
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
      {message !== null ? (
        <View
          testID="toast-message"
          accessibilityRole="alert"
          className="absolute bottom-24 left-6 right-6 rounded-xl bg-elevated p-4"
        >
          <View className="flex-row items-center justify-between">
            <Text numberOfLines={2} className="flex-1 text-sm text-text">
              {message}
            </Text>
            <Pressable testID="toast-dismiss" onPress={dismiss} hitSlop={HIT_SLOP.slop}>
              <Text className="ml-3 text-sm font-bold text-secondary">Fermer</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

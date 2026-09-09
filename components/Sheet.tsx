import { Modal as RNModal, Pressable, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { IconButton } from './IconButton';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  testID?: string;
}

/** Bottom sheet — slide-up panel over a dismissing scrim. */
export function Sheet({ visible, onClose, title, children, testID }: SheetProps): React.JSX.Element {
  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View testID={testID} className="flex-1 justify-end">
        <Pressable
          testID={testID ? `${testID}-scrim` : undefined}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          className="absolute inset-0 bg-black/60"
        />
        <View
          accessible
          accessibilityLabel={title}
          accessibilityViewIsModal
          className="rounded-t-3xl bg-elevated px-6 pb-8 pt-4"
        >
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
        </View>
      </View>
    </RNModal>
  );
}

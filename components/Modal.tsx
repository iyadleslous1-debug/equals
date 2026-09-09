import { Modal as RNModal, Pressable, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { IconButton } from './IconButton';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  testID?: string;
}

export function Modal({ visible, onClose, title, children, testID }: ModalProps): React.JSX.Element {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View testID={testID} className="flex-1 items-center justify-center px-8">
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
          className="w-full rounded-2xl bg-elevated p-6"
        >
          <View className="mb-4 flex-row items-center justify-between">
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

import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { IconButton } from '@/components/IconButton';

export interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
  /** Block-locked conversation: input replaced by a notice, no send path. */
  locked: boolean;
  testID?: string;
}

export function ChatInput({ onSend, disabled, locked, testID }: ChatInputProps) {
  const [text, setText] = useState('');
  const t = (id: string): string => (testID ? `${testID}-${id}` : '');

  if (locked) {
    return (
      <View className="border-t border-border bg-ink px-4 py-3">
        <Text className="text-center text-sm text-muted">Conversation verrouillée.</Text>
      </View>
    );
  }

  const send = (): void => {
    const trimmed = text.trim();
    if (trimmed === '' || disabled) return;
    setText('');
    onSend(trimmed);
  };

  return (
    <View className="flex-row items-end border-t border-border bg-ink px-2 py-2">
      <TextInput
        testID={t('field')}
        value={text}
        onChangeText={setText}
        placeholder="Écrivez un message…"
        multiline
        numberOfLines={4}
        maxLength={1000}
        editable={!disabled}
        accessibilityLabel="Message"
        className="max-h-28 flex-1 rounded-xl border border-border bg-void px-4 py-2 text-base text-text placeholder:text-faint"
        returnKeyType="send"
        onSubmitEditing={send}
      />
      <View className="ml-2 pb-1">
        <IconButton
          name="send"
          label="Envoyer"
          onPress={send}
          disabled={disabled || text.trim() === ''}
          testID={t('send')}
        />
      </View>
    </View>
  );
}

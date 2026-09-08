import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInput as RNTextInput } from 'react-native';
import { OTP_LENGTH } from '@/constants/app';

export interface CodeInputProps {
  onComplete: (code: string) => void;
  onChange?: (code: string) => void;
  autoFocus?: boolean;
  editable?: boolean;
  testID?: string;
}

/**
 * Six-cell OTP entry backed by one hidden input — paste, autofill (iOS
 * one-time-code, Android sms-otp) and hardware keyboards work natively.
 * Cells are decorative; the input carries the accessible name.
 */
export function CodeInput({
  onComplete,
  onChange,
  autoFocus = true,
  editable = true,
  testID,
}: CodeInputProps): React.JSX.Element {
  const [code, setCode] = useState('');
  const inputRef = useRef<RNTextInput>(null);
  // One-shot per value: fires on the transition into full length only, so a
  // delete+retype of the same code is an intentional resubmit, while a second
  // render of an already-complete value never double-submits.
  const wasComplete = useRef(false);
  const digits = code.padEnd(OTP_LENGTH, ' ').split('');

  const handleChange = (raw: string): void => {
    const next = raw.replace(/\D/g, '').slice(0, OTP_LENGTH);
    const complete = next.length === OTP_LENGTH;
    const fire = complete && !wasComplete.current;
    wasComplete.current = complete;
    setCode(next);
    onChange?.(next);
    if (fire) onComplete(next);
  };

  return (
    <Pressable accessibilityRole="none" onPress={() => inputRef.current?.focus()}>
      <View className="flex-row justify-between gap-2">
        {digits.map((digit, index) => (
          <View
            key={index}
            testID={testID ? `${testID}-cell-${index}` : undefined}
            accessible={false}
            className="h-14 w-12 items-center justify-center rounded-xl border border-border bg-ink"
          >
            <Text className="text-xl font-bold text-text">{digit === ' ' ? '' : digit}</Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        testID={testID ? `${testID}-input` : undefined}
        value={code}
        onChangeText={handleChange}
        maxLength={OTP_LENGTH}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus={autoFocus}
        editable={editable}
        accessibilityLabel="Code de confirmation à 6 chiffres"
        className="h-px w-px opacity-0"
      />
    </Pressable>
  );
}

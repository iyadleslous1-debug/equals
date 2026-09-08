import { forwardRef } from 'react';
import { Text, TextInput, View, type TextInput as RNTextInput, type TextInputProps } from 'react-native';

export interface InputProps extends Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'onBlur'
  | 'onSubmitEditing'
  | 'returnKeyType'
  | 'placeholder'
  | 'secureTextEntry'
  | 'keyboardType'
  | 'autoCapitalize'
  | 'autoCorrect'
  | 'autoComplete'
  | 'textContentType'
  | 'maxLength'
  | 'multiline'
  | 'numberOfLines'
  | 'editable'
> {
  label: string;
  hint?: string;
  error?: string;
  testID?: string;
}

export const Input = forwardRef<RNTextInput, InputProps>(function Input(
  { label, hint, error, testID, editable = true, ...rest },
  ref,
) {
  const described = error ?? hint;
  return (
    <View>
      <Text className="mb-2 text-sm font-semibold text-text">{label}</Text>
      <TextInput
        ref={ref}
        testID={testID}
        editable={editable}
        accessibilityLabel={error ? `${label}, ${error}` : label}
        className={`rounded-xl border bg-ink px-4 py-3 text-base text-text placeholder:text-faint ${
          error ? 'border-destructive' : 'border-border'
        }`}
        {...rest}
      />
      {described ? (
        <Text
          testID={error && testID ? `${testID}-error` : undefined}
          nativeID={testID ? `${testID}-description` : undefined}
          accessibilityLiveRegion={error ? 'polite' : 'none'}
          className={`mt-1 text-xs ${error ? 'text-destructive' : 'text-faint'}`}
        >
          {described}
        </Text>
      ) : null}
    </View>
  );
});

import { forwardRef, useEffect, useState } from 'react';
import { Text, TextInput, View, type TextInput as RNTextInput, type TextInputProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { COLORS } from '../constants/theme';
import { DURATIONS } from '../lib/animation';

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
  { label, hint, error, testID, editable = true, multiline = false, onBlur: onBlurProp, ...rest },
  ref,
) {
  const described = error ?? hint;
  const [focused, setFocused] = useState(false);
  const borderColor = useSharedValue<string>(COLORS.border);
  useEffect(() => {
    if (!focused) {
      borderColor.value = withTiming(error ? COLORS.destructive : COLORS.border, {
        duration: DURATIONS.fast,
      });
    }
  }, [error, focused, borderColor]);
  const animatedStyle = useAnimatedStyle(() => ({ borderColor: borderColor.value }));

  return (
    <View>
      <Text style={{ marginBottom: 8, fontSize: 15, fontWeight: '500', color: COLORS.text }}>{label}</Text>
      <Animated.View
        style={[
          animatedStyle,
          {
            backgroundColor: editable ? COLORS.ink : COLORS.elevated,
            borderWidth: focused ? 1.5 : 1,
            borderRadius: 12,
            opacity: editable ? 1 : 0.6,
          },
        ]}
      >
        <TextInput
          ref={ref}
          testID={testID}
          editable={editable}
          multiline={multiline}
          accessibilityLabel={error ? `${label}, ${error}` : label}
          placeholderTextColor={COLORS.muted}
          onFocus={() => {
            setFocused(true);
            borderColor.value = withTiming(error ? COLORS.destructive : COLORS.primary, {
              duration: DURATIONS.fast,
            });
          }}
          onBlur={(event) => {
            setFocused(false);
            borderColor.value = withTiming(error ? COLORS.destructive : COLORS.border, {
              duration: DURATIONS.fast,
            });
            onBlurProp?.(event);
          }}
          style={{
            height: multiline ? undefined : 52,
            minHeight: multiline ? 100 : undefined,
            paddingHorizontal: 16,
            paddingVertical: multiline ? 12 : 0,
            fontSize: 17,
            color: editable ? COLORS.text : COLORS.muted,
            textAlignVertical: multiline ? 'top' : 'auto',
          }}
          {...rest}
        />
      </Animated.View>
      {described ? (
        <Text
          testID={error && testID ? `${testID}-error` : undefined}
          nativeID={testID ? `${testID}-description` : undefined}
          accessibilityLiveRegion={error ? 'polite' : 'none'}
          style={{
            marginTop: 6,
            fontSize: 13,
            color: error ? COLORS.destructive : COLORS.muted,
          }}
        >
          {described}
        </Text>
      ) : null}
    </View>
  );
});

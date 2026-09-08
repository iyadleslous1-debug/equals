import { forwardRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { HIT_SLOP } from '../constants/theme';

export interface FieldError {
  field: string;
  message: string;
}

export interface FormErrorSummaryProps {
  errors: FieldError[];
  /** Called with the field key so the screen can move focus to it. */
  onSelect: (field: string) => void;
  testID?: string;
}

export const FormErrorSummary = forwardRef<View, FormErrorSummaryProps>(function FormErrorSummary(
  { errors, onSelect, testID },
  ref,
) {
  if (errors.length === 0) return null;
  return (
    <View
      ref={ref}
      testID={testID}
      accessible
      accessibilityRole="alert"
      className="rounded-xl border border-destructive bg-ink p-4"
    >
      <Text className="text-sm font-bold text-text">Veuillez corriger :</Text>
      {errors.map((item) => (
        <Pressable
          key={item.field}
          testID={testID ? `${testID}-${item.field}` : undefined}
          onPress={() => onSelect(item.field)}
          hitSlop={HIT_SLOP.slop}
          accessibilityRole="button"
          accessibilityLabel={`${item.message}. Aller au champ.`}
          className="min-h-[44px] justify-center"
        >
          <Text className="text-sm text-destructive underline">{item.message}</Text>
        </Pressable>
      ))}
    </View>
  );
});

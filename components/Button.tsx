import { ActivityIndicator, Pressable, Text, View } from 'react-native';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

const VARIANTS = {
  primary: { button: 'bg-primary', text: 'text-onPrimary' },
  secondary: { button: 'bg-elevated border border-border', text: 'text-text' },
  ghost: { button: 'bg-transparent', text: 'text-secondary' },
  destructive: { button: 'bg-destructive', text: 'text-onDestructive' },
} as const;

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  testID,
}: ButtonProps): React.JSX.Element {
  const inactive = loading || disabled;
  const style = VARIANTS[variant];
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={`flex-row items-center justify-center rounded-xl px-6 py-3 ${style.button} ${
        disabled && !loading ? 'opacity-40' : ''
      }`}
    >
      {/* Fixed-width spinner slot: width is identical loading or not, so no layout shift. */}
      <View className="w-5 items-center">
        {loading ? <ActivityIndicator testID={testID ? `${testID}-loading` : undefined} /> : null}
      </View>
      <Text numberOfLines={1} className={`text-base font-semibold ${style.text}`}>
        {title}
      </Text>
    </Pressable>
  );
}

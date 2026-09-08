import { Text, View } from 'react-native';

export interface BadgeProps {
  label: string;
  variant?: 'info' | 'success' | 'warning' | 'destructive';
  testID?: string;
}

const VARIANTS: Record<NonNullable<BadgeProps['variant']>, { container: string; text: string }> = {
  info: { container: 'border-secondary', text: 'text-secondary' },
  success: { container: 'border-success', text: 'text-success' },
  warning: { container: 'border-warning', text: 'text-warning' },
  destructive: { container: 'border-destructive', text: 'text-destructive' },
} as const;

export function Badge({ label, variant = 'info', testID }: BadgeProps): React.JSX.Element {
  const style = VARIANTS[variant];
  return (
    <View testID={testID} className={`rounded-full border bg-elevated px-3 py-1 ${style.container}`}>
      <Text className={`text-xs font-semibold ${style.text}`}>{label}</Text>
    </View>
  );
}

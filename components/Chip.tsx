import { Pressable, Text } from 'react-native';
import { HIT_SLOP } from '../constants/theme';

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

export function Chip({ label, selected, onPress, testID }: ChipProps): React.JSX.Element {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      hitSlop={HIT_SLOP.slop}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      className={`rounded-full border px-4 py-2 ${
        selected ? 'border-primary bg-primary' : 'border-border bg-ink'
      }`}
    >
      <Text className={`text-sm font-semibold ${selected ? 'text-onPrimary' : 'text-muted'}`}>{label}</Text>
    </Pressable>
  );
}

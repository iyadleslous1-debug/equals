import { ActivityIndicator, Text, View } from 'react-native';
import { COLORS } from '../constants/theme';

export interface LoadingStateProps {
  label: string;
  testID?: string;
}

export function LoadingState({ label, testID }: LoadingStateProps): React.JSX.Element {
  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      className="flex-1 items-center justify-center px-8"
    >
      <ActivityIndicator size="large" color={COLORS.secondary} />
      <Text
        style={{ marginTop: 16, textAlign: 'center', fontSize: 15, fontWeight: '500', color: COLORS.muted }}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * MVP0 placeholder route — proves router + NativeWind + env validation boot.
 * It is NOT a feature screen. MVP1 replaces this with the auth gate that
 * redirects to `(auth)/phone` or `(tabs)/discover`.
 */
import { Text, View } from 'react-native';

export default function Index(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-void px-6">
      <Text className="text-2xl font-bold text-white">DZ Connect</Text>
      <Text className="mt-2 text-center text-sm text-white/60">
        MVP0 foundation is live. Auth, schema and tooling are ready — feature screens land in MVP1.
      </Text>
    </View>
  );
}

/* eslint-disable react-hooks/immutability -- reanimated shared-value mutation is the animation API */
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { COLORS } from '../constants/theme';
import { SPRINGS } from '../lib/animation';
import { haptics } from '../lib/haptics';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  discover: 'compass',
  requests: 'people',
  chat: 'chatbubbles',
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function TabItem({
  icon,
  label,
  active,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const color = active ? COLORS.primary : COLORS.muted;
  return (
    <AnimatedPressable
      testID={testID}
      onPressIn={() => {
        scale.value = withSpring(0.9, { damping: 20, stiffness: 400 });
        void haptics.light();
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRINGS.spring);
      }}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={[animatedStyle, { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }]}
    >
      {active ? (
        <View
          style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary, marginBottom: 2 }}
        />
      ) : null}
      <Ionicons name={icon} size={24} color={color} />
      <Text style={{ fontSize: 11, fontWeight: '500', color }}>{label}</Text>
    </AnimatedPressable>
  );
}

export interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: unknown; tabBarLabel?: unknown } }>;
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
}

export function TabBar({ state, descriptors, navigation }: TabBarProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="tab-bar"
      style={{
        flexDirection: 'row',
        backgroundColor: COLORS.void,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 8),
      }}
    >
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key];
        if (!descriptor) return null;
        const { options } = descriptor;
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : typeof options.title === 'string'
              ? options.title
              : route.name;
        const isFocused = state.index === index;
        const onPress = (): void => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };
        return (
          <TabItem
            key={route.key}
            icon={ICONS[route.name] ?? 'compass'}
            label={label}
            active={isFocused}
            onPress={onPress}
            testID={`tab-${route.name}`}
          />
        );
      })}
    </View>
  );
}

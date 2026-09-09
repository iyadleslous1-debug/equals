/**
 * Minimal react-native-reanimated stub for jest. Animations resolve
 * instantly: shared values are plain objects, drivers are identity fns.
 * Tests assert rendered output and callbacks, never animation frames.
 */
const React = require('react');
const { View, Text, Pressable, FlatList, ScrollView } = require('react-native');

const wrap = (Component) => {
  const Wrapped = React.forwardRef((props, ref) => React.createElement(Component, { ...props, ref }));
  Wrapped.displayName = `Reanimated(${Component.displayName ?? Component.name ?? 'Component'})`;
  return Wrapped;
};

module.exports = {
  __esModule: true,
  default: {
    View: wrap(View),
    Text: wrap(Text),
    Pressable: wrap(Pressable),
    FlatList,
    ScrollView,
    createAnimatedComponent: (Component) => wrap(Component),
  },
  createAnimatedComponent: (Component) => wrap(Component),
  useSharedValue: (initial) => ({ value: initial }),
  useAnimatedStyle: (updater) => updater(),
  useEvent: (handler) => handler,
  useHandler: (handlers) => handlers,
  withSpring: (value) => value,
  withTiming: (value) => value,
  withDelay: (_delay, value) => value,
  withSequence: (...values) => values[values.length - 1],
  interpolate: (value) => value,
  cancelAnimation: () => undefined,
  runOnJS: (fn) => fn,
  Easing: {
    linear: (t) => t,
    bezier: () => (t) => t,
    in: (e) => e,
    out: (e) => e,
    inOut: (e) => e,
  },
};

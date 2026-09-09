/* global jest:readonly */
/**
 * Jest sandbox env. The app fail-fasts on missing env vars by design
 * (`lib/config.ts` throws at import), so tests run against explicit dummies.
 * Real secrets are never needed — and never loaded — here.
 */
process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';
process.env.EXPO_PUBLIC_SMS_PROVIDER ??= 'disabled';
process.env.EXPO_PUBLIC_APP_ENV ??= 'development';

// Native modules with no jest implementation: mock at the boundary so
// component tests exercise logic, not native drivers.
jest.mock('react-native-reanimated', () => require('./__tests__/mocks/reanimated'));
require('react-native-gesture-handler/jestSetup');
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return { BlurView: View };
});
jest.mock('expo-image', () => {
  const { Image } = require('react-native');
  return { Image };
});
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

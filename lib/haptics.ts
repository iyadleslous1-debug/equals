/**
 * Haptic vocabulary (KIN spec §2) — one named call per interaction.
 * expo-haptics no-ops on devices without a haptic engine; no guards needed.
 */
import * as Haptics from 'expo-haptics';

export const haptics = {
  light: (): Promise<void> => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).then(() => undefined),
  medium: (): Promise<void> => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).then(() => undefined),
  heavy: (): Promise<void> => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).then(() => undefined),
  success: (): Promise<void> =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).then(() => undefined),
  warning: (): Promise<void> =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).then(() => undefined),
  error: (): Promise<void> =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).then(() => undefined),
  selection: (): Promise<void> => Haptics.selectionAsync().then(() => undefined),
};

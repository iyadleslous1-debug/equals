/**
 * Numeric theme tokens — the single source of truth for spacing, shape,
 * elevation, animation and touch targets.
 *
 * Colors live ONLY in `tailwind.config.js` (so a token rename breaks the
 * build instead of drifting silently). This file holds everything numeric
 * that NativeWind classes can't express (iOS shadows, hitSlop, durations).
 */

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  giant: 64,
} as const;

/** Screen gutters: 16 phone, 24 tablet/landscape. */
export const GUTTER = { phone: 16, large: 24 } as const;

/** Cap centered content on tablets so text stays readable. */
export const MAX_CONTENT_WIDTH = 640;

export const RADIUS = {
  input: 12,
  button: 12,
  card: 16,
  sheet: 24,
  full: 9999,
} as const;

interface IosShadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
}

interface Elevation {
  android: number;
  ios: IosShadow;
}

const iosShadow = (height: number, opacity: number, radius: number): IosShadow => ({
  shadowColor: '#000000',
  shadowOffset: { width: 0, height },
  shadowOpacity: opacity,
  shadowRadius: radius,
});

export const ELEVATION: Record<'card' | 'sheet' | 'modal', Elevation> = {
  card: { android: 2, ios: iosShadow(2, 0.25, 4) },
  sheet: { android: 4, ios: iosShadow(4, 0.3, 8) },
  modal: { android: 8, ios: iosShadow(8, 0.35, 16) },
};

export const ANIMATION = {
  /** press feedback, fades */
  duration: { fast: 150, base: 200, slow: 300 },
} as const;

export const ICON_SIZE = { sm: 20, md: 24, lg: 32 } as const;

/** Expanded tap area for visually-small controls. */
export const HIT_SLOP = {
  minIos: 44,
  minAndroid: 48,
  slop: { top: 10, bottom: 10, left: 10, right: 10 },
} as const;

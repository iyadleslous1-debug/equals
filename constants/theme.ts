/**
 * Numeric theme tokens — the single source of truth for spacing, shape,
 * elevation, animation and touch targets.
 *
 * Hex colors live in `tailwind.config.js`. `COLORS` below mirrors them for
 * the few props that need raw strings (icon color, spinner color) — and
 * `__tests__/theme.test.ts` asserts the two stay identical, so drift fails
 * the build instead of shipping silently.
 */

export const COLORS = {
  void: '#0f1419',
  ink: '#1a2028',
  elevated: '#252d38',
  primary: '#3368a0',
  onPrimary: '#ffffff',
  secondary: '#66a3bf',
  tertiary: '#c8dfdb',
  text: '#f2efe7',
  muted: '#8a9ba8',
  // Same value as muted by spec (placeholders use muted); separate token
  // so faint usages can diverge later without a hunt.
  faint: '#8a9ba8',
  border: '#2a3441',
  destructive: '#e5484d',
  onDestructive: '#ffffff',
  success: '#30a46c',
  warning: '#f5a524',
  onWarning: '#0f1419',
  /** Tinted surfaces that need alpha (chip select, scrims). */
  primaryTint: 'rgba(51,104,160,0.15)',
  scrim: 'rgba(15,20,25,0.7)',
} as const;

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

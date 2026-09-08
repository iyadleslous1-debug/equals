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
  void: '#0f0b1e',
  ink: '#17122b',
  elevated: '#241b40',
  primary: '#d9a441',
  onPrimary: '#0f0b1e',
  secondary: '#8b7bc7',
  text: '#f4f1fa',
  muted: '#b8b0d1',
  faint: '#8a83a3',
  border: '#2e2547',
  destructive: '#dc2626',
  onDestructive: '#ffffff',
  success: '#34d399',
  warning: '#f59e0b',
  onWarning: '#0f0b1e',
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

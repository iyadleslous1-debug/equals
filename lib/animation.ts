/**
 * Motion tokens (KIN spec §2) — curves as data, durations in ms.
 *
 * Curves are plain bezier tuples / spring configs (no reanimated import),
 * so this module stays jest-safe; components convert with Easing.bezier()
 * or withSpring() at the call site.
 */

export const BEZIER_EASE_OUT: readonly [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

export interface SpringConfig {
  damping: number;
  stiffness: number;
  mass: number;
}

export const SPRINGS: Record<'spring' | 'screenTransition' | 'snappy' | 'bouncy', SpringConfig> = {
  spring: { damping: 15, stiffness: 150, mass: 1 },
  screenTransition: { damping: 20, stiffness: 120, mass: 0.8 },
  snappy: { damping: 25, stiffness: 300, mass: 0.5 },
  bouncy: { damping: 12, stiffness: 200, mass: 0.8 },
};

export const DURATIONS = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400,
  slower: 600,
} as const;

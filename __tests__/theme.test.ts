import { ANIMATION, ELEVATION, HIT_SLOP, ICON_SIZE, RADIUS, SPACING } from '../constants/theme';

describe('theme tokens', () => {
  it('uses a 4dp-based spacing scale with the required tiers', () => {
    const required = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64];
    for (const tier of required) {
      expect(Object.values(SPACING)).toContain(tier);
    }
    for (const value of Object.values(SPACING)) {
      expect(value % 4).toBe(0);
    }
  });

  it('meets platform touch-target minimums', () => {
    expect(HIT_SLOP.minIos).toBeGreaterThanOrEqual(44);
    expect(HIT_SLOP.minAndroid).toBeGreaterThanOrEqual(48);
  });

  it('keeps radii, icons and animation within sane bounds', () => {
    expect(RADIUS.button).toBe(12);
    expect(RADIUS.card).toBe(16);
    expect(ICON_SIZE.md).toBe(24);
    for (const ms of Object.values(ANIMATION.duration)) {
      expect(ms).toBeGreaterThanOrEqual(100);
      expect(ms).toBeLessThanOrEqual(400);
    }
  });

  it('defines elevation per platform scale', () => {
    expect(ELEVATION.card.android).toBeGreaterThanOrEqual(2);
    expect(ELEVATION.modal.android).toBeGreaterThan(ELEVATION.card.android);
    expect(ELEVATION.card.ios.shadowOpacity).toBeGreaterThan(0);
  });
});

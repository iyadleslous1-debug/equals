import { compatibilityBand, orderByScore } from '../lib/compatibility';

describe('compatibilityBand (MVP2 piece 2)', () => {
  it('labels high scores subtly and stays silent otherwise', () => {
    expect(compatibilityBand(100)).toBe('Great match');
    expect(compatibilityBand(75)).toBe('Great match');
    expect(compatibilityBand(74)).toBe('Good match');
    expect(compatibilityBand(50)).toBe('Good match');
    expect(compatibilityBand(49)).toBeNull();
    expect(compatibilityBand(0)).toBeNull();
    expect(compatibilityBand(null)).toBeNull();
    expect(compatibilityBand(undefined)).toBeNull();
    expect(compatibilityBand(NaN)).toBeNull();
    expect(compatibilityBand(101)).toBe('Great match');
  });
});

describe('orderByScore (MVP2 piece 2)', () => {
  const key = (u: { id: string }): string => u.id;

  it('floats higher scores first, keeps server order on ties', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const scores = new Map([
      ['a', 60],
      ['b', 90],
      ['c', 90],
    ]);
    expect(orderByScore(items, key, scores).map((u) => u.id)).toEqual(['b', 'c', 'a']);
  });

  it('leaves unscored profiles in server order after scored ones', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const scores = new Map([['b', 70]]);
    expect(orderByScore(items, key, scores).map((u) => u.id)).toEqual(['b', 'a', 'c']);
  });

  it('is a no-op without any scores (survey-less viewer, default order)', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    const out = orderByScore(items, key, new Map());
    expect(out.map((u) => u.id)).toEqual(['a', 'b']);
    expect(out).not.toBe(items);
  });
});

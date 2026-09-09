import { parseWith, deckFiltersSchema } from '../lib/validation/schemas';

describe('deckFiltersSchema (MVP2 piece 4)', () => {
  it('accepts empty (no filters) and full sets', () => {
    expect(parseWith(deckFiltersSchema, {}).ok).toBe(true);
    expect(
      parseWith(deckFiltersSchema, { age_min: 25, age_max: 35, wilayas: [16, 31], sort: 'newest' }).ok,
    ).toBe(true);
  });

  it('rejects inverted ranges and out-of-range values', () => {
    expect(parseWith(deckFiltersSchema, { age_min: 40, age_max: 30 }).ok).toBe(false);
    expect(parseWith(deckFiltersSchema, { age_min: 17 }).ok).toBe(false);
    expect(parseWith(deckFiltersSchema, { age_max: 101 }).ok).toBe(false);
    expect(parseWith(deckFiltersSchema, { wilayas: [0] }).ok).toBe(false);
    expect(parseWith(deckFiltersSchema, { wilayas: [59] }).ok).toBe(false);
    expect(parseWith(deckFiltersSchema, { sort: 'mystery' }).ok).toBe(false);
  });

  it('accepts nulls as explicit clears', () => {
    const result = parseWith(deckFiltersSchema, { age_min: null, wilayas: null, sort: null });
    expect(result.ok).toBe(true);
  });
});

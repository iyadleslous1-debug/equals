/**
 * Compatibility presentation helpers (MVP2 piece 2).
 *
 * Scores (0–100) are computed server-side by `get_compatibility` — raw
 * survey answers never leave the database. This module only presents:
 * subtle bands (never judgmental labels) and deck ordering.
 */

export type CompatibilityBand = 'Great match' | 'Good match';

const GREAT_MATCH_MIN = 75;
const GOOD_MATCH_MIN = 50;

/**
 * Subtle indicator for profile detail (piece 3). Low scores render as
 * NOTHING — the product never tells a user they're a bad match.
 */
export function compatibilityBand(score: number | null | undefined): CompatibilityBand | null {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  if (score >= GREAT_MATCH_MIN) return 'Great match';
  if (score >= GOOD_MATCH_MIN) return 'Good match';
  return null;
}

/**
 * Stable order: scored profiles first (best first), unscored keep their
 * server order after them. Empty score map = identity (survey-less viewer
 * sees the default deck, no penalty, no different treatment).
 */
export function orderByScore<T>(items: T[], key: (item: T) => string, scores: Map<string, number>): T[] {
  if (scores.size === 0) return [...items];
  return items
    .map((item, index) => ({ item, index }))
    .sort((x, y) => {
      const a = scores.get(key(x.item));
      const b = scores.get(key(y.item));
      if (a === undefined && b === undefined) return x.index - y.index;
      if (a === undefined) return 1;
      if (b === undefined) return -1;
      return b - a || x.index - y.index;
    })
    .map(({ item }) => item);
}

/**
 * Canonical ordering for unordered user pairs (conversations `a<b`, mirrored
 * request reconciliation). Deterministic: same inputs, same order, always.
 */
export function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

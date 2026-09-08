/**
 * Monotonic clock for timings. `performance.now` where available (RN Hermes +
 * modern browsers), `Date.now` fallback (not monotonic, but better than NaN).
 */
export function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

/**
 * Performance markers — console timing today, real traces tomorrow.
 *
 * `timed(name, fn)` logs `perf:<name>` with `durationMs` at debug level, so
 * slow auth calls, health pings and (later) discovery queries show up in
 * LogBox/Expo output with zero setup. When Sentry/PostHog arrive (see
 * `docs/observability-plan.md`), this module gains span emission WITHOUT
 * changing call sites — that is its entire job.
 */
import { nowMs } from './clock';
import { createLogger } from './logger';

const log = createLogger('perf');

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export async function timed<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = nowMs();
  try {
    return await fn();
  } finally {
    log.debug(`perf:${name}`, { durationMs: round1(nowMs() - start) });
  }
}

export function timeSync<T>(name: string, fn: () => T): T {
  const start = nowMs();
  try {
    return fn();
  } finally {
    log.debug(`perf:${name}`, { durationMs: round1(nowMs() - start) });
  }
}

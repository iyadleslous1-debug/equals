/**
 * Minimal structured logger.
 *
 * Why not bare `console.log`: structured lines (`timestamp level scope message
 * +context`) are greppable in Expo/LogBox output and forward-compatible with a
 * real transport later (Sentry breadcrumbs, PostHog, file export). Swap the
 * `sink` to redirect output without touching call sites.
 *
 * Privacy: phone numbers are masked, and a deny-list of sensitive keys is
 * redacted from logged context objects.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type Sink = (level: LogLevel, line: string) => void;

const defaultSink: Sink = (level, line) => {
  // The logger is the single sanctioned console boundary in the app.
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  // eslint-disable-next-line no-console
  else if (level === 'info') console.info(line);
  // eslint-disable-next-line no-console
  else console.debug(line);
};

let sink: Sink = defaultSink;

/** Override where log lines go (tests, future transports). */
export function setLogSink(next: Sink): void {
  sink = next;
}

/** Restore console output. */
export function resetLogSink(): void {
  sink = defaultSink;
}

const SENSITIVE_KEYS = new Set([
  'token',
  'access_token',
  'refresh_token',
  'otp',
  'code',
  'password',
  'phone',
  'phone_number',
]);

/** Mask an Algerian/international number: `+213 555 12 34` → `+213 ••• •• 34`. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  const cc = phone.trim().startsWith('+') ? `+${digits.slice(0, digits.length - 9)} ` : '';
  return `${cc}••• •• ${digits.slice(-2)}`;
}

/** Recursively redact sensitive keys from a context object (pure, testable). */
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        out[key] = key.toLowerCase().includes('phone') ? maskPhone(String(entry)) : '[redacted]';
      } else {
        out[key] = redact(entry);
      }
    }
    return out;
  }
  return value;
}

const RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

let minLevel: LogLevel = 'debug';

/** Drop log lines below this level (useful in tests / noisy dev sessions). */
export function setMinLevel(level: LogLevel): void {
  minLevel = level;
}

function emit(level: LogLevel, scope: string, message: string, context?: unknown): void {
  // `debug` is dev-only; everything else ships so production issues stay visible.
  if (level === 'debug' && process.env.NODE_ENV === 'production') return;
  if (RANK[level] < RANK[minLevel]) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    scope,
    msg: message,
    ...(context === undefined ? {} : { ctx: redact(context) }),
  });
  sink(level, line);
}

/** Create a scoped logger, e.g. `const log = createLogger('auth')`. */
export function createLogger(scope: string): Record<LogLevel, (message: string, context?: unknown) => void> {
  return {
    debug: (message, context) => emit('debug', scope, message, context),
    info: (message, context) => emit('info', scope, message, context),
    warn: (message, context) => emit('warn', scope, message, context),
    error: (message, context) => emit('error', scope, message, context),
  };
}

/** Root logger for one-off lines. Prefer `createLogger(scope)` in modules. */
export const logger = createLogger('app');

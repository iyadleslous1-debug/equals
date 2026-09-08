/**
 * Central environment config with fail-fast validation.
 *
 * Environments (see README "Environments"): local dev, staging, production.
 * Switching is done ENTIRELY through env vars — `EXPO_PUBLIC_APP_ENV` selects
 * the behavior matrix, and each environment points at its own Supabase project
 * via `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`. No
 * hardcoded URLs or keys exist anywhere in `lib/`, `app/` or `features/`
 * (CI greps for them — see `.github/workflows/ci.yml`).
 *
 * Failure policy:
 *  - Missing/invalid REQUIRED vars → throw at startup (all envs).
 *  - Production extras (localhost/placeholder URL or key, sentry reporter
 *    without DSN) → throw. Prod must fail loudly, never limp along.
 *  - Missing OPTIONAL dev-only vars (Sentry DSN, PostHog key) → warn via
 *    `reportOptionalEnv()` in non-production. Never throw.
 *
 * `.env` values are local-only (gitignored). Committed templates:
 * `.env.example`, `.env.development`, `.env.staging`, `.env.production`.
 */
import { createLogger } from './logger';

export type SmsProviderKind = 'twilio' | 'algerian' | 'disabled';
export type AppEnv = 'development' | 'staging' | 'production';
export type LogLevelName = 'debug' | 'info' | 'warn' | 'error';
export type ErrorReporterKind = 'console' | 'sentry';

export interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  /** Which SMS sender delivers OTP codes. See `lib/sms.ts` for the DZ context. */
  smsProvider: SmsProviderKind;
  appEnv: AppEnv;
  /** Verbosity. Defaults per env (debug/info/warn); override with EXPO_PUBLIC_LOG_LEVEL. */
  logLevel: LogLevelName;
  /** Crash-reporting backend. 'sentry' requires EXPO_PUBLIC_SENTRY_DSN. */
  errorReporter: ErrorReporterKind;
  sentryDsn?: string;
  posthogKey?: string;
}

const REQUIRED_DOCS: Record<string, string> = {
  EXPO_PUBLIC_SUPABASE_URL: 'Supabase project URL (Dashboard → Project Settings → API)',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'Supabase anon public key (Dashboard → Project Settings → API)',
};

/** Optional in dev, warned-about when absent outside production. */
const OPTIONAL_DEV_DOCS: Record<string, string> = {
  EXPO_PUBLIC_SENTRY_DSN: 'crash reporting stays console-only without it',
  EXPO_PUBLIC_POSTHOG_KEY: 'product analytics stays disabled without it',
};

const DEFAULT_LOG_LEVEL: Record<AppEnv, LogLevelName> = {
  development: 'debug',
  staging: 'info',
  production: 'warn',
};

const PLACEHOLDER_PATTERNS = [
  /xyzcompany/i,
  /placeholder/i,
  /example\.com/i,
  /localhost/i,
  /127\.0\.0\.1/i,
  /::1/,
];

function readEnv(source: Record<string, string | undefined>, key: string): string | undefined {
  const value = source[key]?.trim();
  return value === '' ? undefined : value;
}

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  if (value === undefined) return fallback;
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new Error(`[config] Got "${value}" — must be one of: ${allowed.join(', ')}.`);
}

/**
 * Pure validator — takes an env map, returns typed config or throws.
 * Kept pure (no `process.env` access) so it is unit-testable.
 */
export function validateEnv(source: Record<string, string | undefined>): EnvConfig {
  const missing = Object.keys(REQUIRED_DOCS).filter((key) => readEnv(source, key) === undefined);
  if (missing.length > 0) {
    const details = missing.map((key) => `  • ${key} — ${REQUIRED_DOCS[key]}`).join('\n');
    throw new Error(
      `[config] Missing required environment variable(s). Copy .env.example to .env and fill them in:\n${details}`,
    );
  }

  const supabaseUrl = readEnv(source, 'EXPO_PUBLIC_SUPABASE_URL') as string;
  const appEnv = oneOf(
    readEnv(source, 'EXPO_PUBLIC_APP_ENV'),
    ['development', 'staging', 'production'] as const,
    'development',
  );
  // Loopback + private-LAN HTTP are allowed outside production so `supabase
  // start` works locally (API gateway at http://localhost:54321) and Expo Go
  // devices reach it over the LAN (e.g. http://192.168.1.198:54321).
  // Everything else must be https; production is https-only, always.
  const isLoopback = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?/.test(supabaseUrl);
  const isPrivateLan =
    /^http:\/\/(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?\/?/.test(
      supabaseUrl,
    );
  if (!/^https:\/\/.+/.test(supabaseUrl) && !((isLoopback || isPrivateLan) && appEnv !== 'production')) {
    throw new Error(
      '[config] EXPO_PUBLIC_SUPABASE_URL must be an https:// URL (http://localhost:* and private-LAN http://10/172.16/192.168:* are allowed outside production).',
    );
  }

  const smsProvider = oneOf(
    readEnv(source, 'EXPO_PUBLIC_SMS_PROVIDER'),
    ['twilio', 'algerian', 'disabled'] as const,
    'disabled',
  );
  const logLevel = oneOf(
    readEnv(source, 'EXPO_PUBLIC_LOG_LEVEL'),
    ['debug', 'info', 'warn', 'error'] as const,
    DEFAULT_LOG_LEVEL[appEnv],
  );
  const errorReporter = oneOf(
    readEnv(source, 'EXPO_PUBLIC_ERROR_REPORTER'),
    ['console', 'sentry'] as const,
    'console',
  );
  const sentryDsn = readEnv(source, 'EXPO_PUBLIC_SENTRY_DSN');
  const posthogKey = readEnv(source, 'EXPO_PUBLIC_POSTHOG_KEY');

  // Production fails loudly on anything that smells like dev configuration.
  if (appEnv === 'production') {
    const badUrl = PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(supabaseUrl));
    if (badUrl) {
      throw new Error(
        '[config] Refusing production boot: EXPO_PUBLIC_SUPABASE_URL looks like a placeholder or localhost.',
      );
    }
    const anonKey = readEnv(source, 'EXPO_PUBLIC_SUPABASE_ANON_KEY') as string;
    if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(anonKey))) {
      throw new Error(
        '[config] Refusing production boot: EXPO_PUBLIC_SUPABASE_ANON_KEY looks like a placeholder.',
      );
    }
    if (errorReporter === 'sentry' && sentryDsn === undefined) {
      throw new Error(
        '[config] Refusing production boot: EXPO_PUBLIC_ERROR_REPORTER=sentry but EXPO_PUBLIC_SENTRY_DSN is missing.',
      );
    }
  }

  return {
    supabaseUrl,
    supabaseAnonKey: readEnv(source, 'EXPO_PUBLIC_SUPABASE_ANON_KEY') as string,
    smsProvider,
    appEnv,
    logLevel,
    errorReporter,
    ...(sentryDsn === undefined ? {} : { sentryDsn }),
    ...(posthogKey === undefined ? {} : { posthogKey }),
  };
}

/**
 * Pure inventory of missing optional vars (warn, don't fail).
 * Returns human-readable warning lines; empty when everything is set.
 */
export function collectEnvWarnings(source: Record<string, string | undefined>): string[] {
  return Object.entries(OPTIONAL_DEV_DOCS)
    .filter(([key]) => readEnv(source, key) === undefined)
    .map(([key, why]) => `${key} is not set — ${why}.`);
}

/**
 * Warn (never throw) about missing optional dev-only vars. Call once at
 * startup in non-production; production stays silent unless misconfigured
 * (which throws in `validateEnv` instead).
 */
export function reportOptionalEnv(source: Record<string, string | undefined> = process.env): void {
  const env = readEnv(source, 'EXPO_PUBLIC_APP_ENV') ?? 'development';
  if (env === 'production') return;
  const log = createLogger('config');
  for (const warning of collectEnvWarnings(source)) log.warn(`[config] ${warning}`);
}

/** Validated app config. Throws on import when required env vars are missing. */
export const config: EnvConfig = validateEnv(process.env);

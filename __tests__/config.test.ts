import { collectEnvWarnings, validateEnv } from '../lib/config';

const BASE = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://xyzcompany.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
};

const PROD = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://abcdefgh.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'real-anon-key',
  EXPO_PUBLIC_APP_ENV: 'production',
};

describe('validateEnv', () => {
  it('accepts a complete env with sensible defaults', () => {
    expect(validateEnv({ ...BASE })).toEqual({
      supabaseUrl: BASE.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: 'anon-key',
      smsProvider: 'disabled',
      appEnv: 'development',
      logLevel: 'debug',
      errorReporter: 'console',
    });
  });

  it('throws a helpful error listing every missing key', () => {
    expect(() => validateEnv({})).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
    expect(() => validateEnv({})).toThrow(/EXPO_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it('rejects non-https, non-loopback URLs', () => {
    expect(() => validateEnv({ ...BASE, EXPO_PUBLIC_SUPABASE_URL: 'http://example.com' })).toThrow(
      /https:\/\//,
    );
  });

  it('allows loopback HTTP outside production (supabase start)', () => {
    const config = validateEnv({ ...BASE, EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:54321' });
    expect(config.supabaseUrl).toBe('http://localhost:54321');
  });

  it('allows private-LAN HTTP outside production (Expo Go device testing)', () => {
    for (const url of ['http://192.168.1.198:54321', 'http://10.0.0.5:54321', 'http://172.20.10.3:54321']) {
      expect(validateEnv({ ...BASE, EXPO_PUBLIC_SUPABASE_URL: url }).supabaseUrl).toBe(url);
    }
  });

  it('still rejects public HTTP and LAN HTTP in production', () => {
    expect(() => validateEnv({ ...BASE, EXPO_PUBLIC_SUPABASE_URL: 'http://203.0.113.5:54321' })).toThrow(
      /https:\/\//,
    );
    expect(() => validateEnv({ ...PROD, EXPO_PUBLIC_SUPABASE_URL: 'http://192.168.1.198:54321' })).toThrow(
      /https:\/\//,
    );
  });

  it('rejects unknown enum values instead of silently defaulting', () => {
    expect(() => validateEnv({ ...BASE, EXPO_PUBLIC_SMS_PROVIDER: 'pigeon' })).toThrow(/twilio/);
    expect(() => validateEnv({ ...BASE, EXPO_PUBLIC_APP_ENV: 'qa' })).toThrow(/development/);
    expect(() => validateEnv({ ...BASE, EXPO_PUBLIC_LOG_LEVEL: 'verbose' })).toThrow(/debug/);
  });

  it('accepts explicit selections', () => {
    const config = validateEnv({
      ...BASE,
      EXPO_PUBLIC_SMS_PROVIDER: 'algerian',
      EXPO_PUBLIC_APP_ENV: 'staging',
      EXPO_PUBLIC_LOG_LEVEL: 'error',
    });
    expect(config.smsProvider).toBe('algerian');
    expect(config.appEnv).toBe('staging');
    expect(config.logLevel).toBe('error');
  });

  it('defaults log verbosity per environment', () => {
    expect(validateEnv({ ...BASE }).logLevel).toBe('debug');
    expect(validateEnv({ ...BASE, EXPO_PUBLIC_APP_ENV: 'staging' }).logLevel).toBe('info');
    expect(validateEnv({ ...PROD }).logLevel).toBe('warn');
  });
});

describe('production guards (fail loudly)', () => {
  it('refuses placeholder or localhost URLs in production', () => {
    expect(() => validateEnv({ ...BASE, EXPO_PUBLIC_APP_ENV: 'production' })).toThrow(
      /placeholder|localhost/,
    );
    expect(() => validateEnv({ ...PROD, EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:54321' })).toThrow();
  });

  it('refuses placeholder anon keys in production', () => {
    expect(() => validateEnv({ ...PROD, EXPO_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-key' })).toThrow(
      /placeholder/,
    );
  });

  it('requires a DSN when the sentry reporter is selected in production', () => {
    expect(() => validateEnv({ ...PROD, EXPO_PUBLIC_ERROR_REPORTER: 'sentry' })).toThrow(/SENTRY_DSN/);
    expect(
      validateEnv({ ...PROD, EXPO_PUBLIC_ERROR_REPORTER: 'sentry', EXPO_PUBLIC_SENTRY_DSN: 'https://x@y/1' })
        .errorReporter,
    ).toBe('sentry');
  });

  it('boots cleanly with a realistic production env', () => {
    expect(() => validateEnv({ ...PROD })).not.toThrow();
  });
});

describe('collectEnvWarnings (warn, never fail)', () => {
  it('lists missing optional vars', () => {
    expect(collectEnvWarnings({ ...BASE })).toEqual([
      expect.stringContaining('EXPO_PUBLIC_SENTRY_DSN'),
      expect.stringContaining('EXPO_PUBLIC_POSTHOG_KEY'),
    ]);
  });

  it('is empty when optionals are set', () => {
    expect(
      collectEnvWarnings({ ...BASE, EXPO_PUBLIC_SENTRY_DSN: 'x', EXPO_PUBLIC_POSTHOG_KEY: 'y' }),
    ).toEqual([]);
  });
});

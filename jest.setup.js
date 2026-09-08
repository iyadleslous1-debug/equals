/**
 * Jest sandbox env. The app fail-fasts on missing env vars by design
 * (`lib/config.ts` throws at import), so tests run against explicit dummies.
 * Real secrets are never needed — and never loaded — here.
 */
process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';
process.env.EXPO_PUBLIC_SMS_PROVIDER ??= 'disabled';
process.env.EXPO_PUBLIC_APP_ENV ??= 'development';

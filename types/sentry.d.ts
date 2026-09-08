/**
 * Ambient Sentry SDK types.
 *
 * `@sentry/react-native` is NOT installed in MVP0 (console reporting only).
 * This declaration lets `lib/reporting.ts` reference the SDK behind a guarded
 * dynamic import that fails gracefully until the package + DSN are added.
 * When Sentry ships, replace this shim with the real package types.
 */
declare module '@sentry/react-native' {
  export function captureException(error: unknown, hint?: { extra?: Record<string, unknown> }): void;
  export function setUser(user: { id: string } | null): void;
  export function init(options: { dsn: string }): void;
}

# Observability plan — plug-in points (no implementation yet)

When volume justifies it, analytics and crash reporting land WITHOUT
refactoring call sites. The seams already exist:

## Crash reporting → Sentry

1. `npm i @sentry/react-native`, paste DSN into the env file.
2. Set `EXPO_PUBLIC_ERROR_REPORTER=sentry`.
3. Done. `lib/reporting.ts` (`getReporter` / `SentryReporter`) picks it up;
   `ErrorBoundary` and every `reportError()` call site flow through it.
4. Add release health later via `Sentry.init({ enableNativeCrashHandling })`
   in the same `init()` — one file changes.

Until then: `ConsoleReporter` keeps structured lines locally; nothing leaves
the device. Never `console.log` errors directly — always `reportError()`.

## Product analytics → PostHog (suggested)

1. Add `posthog-react-native` (+ the `EXPO_PUBLIC_POSTHOG_KEY` already in the
   config shape).
2. Create `lib/analytics.ts` with a tiny typed event bus:
   `track(event: 'request_sent' | 'message_sent' | …, props)` — string-union
   event names so renames are compiler-checked.
3. Emit from feature `api.ts` layers (the `ApiResult` boundaries), never from
   deep UI components. Screen-view events go in route files.
4. Keep PII out of props (user IDs only; no message text, no emails).

## Logs & traces

- Verbosity is per-env today: `EXPO_PUBLIC_LOG_LEVEL` or the
  debug/info/warn default matrix in `lib/config.ts`; applied once in
  `app/_layout.tsx` via `setMinLevel()`. To redirect output (file export,
  remote tail), swap the sink with `setLogSink()` — one line.
- `timed(name, fn)` in `lib/perf.ts` marks slow operations (auth, health,
  later discovery). When Sentry arrives, extend `timed()` to open a span —
  call sites stay identical.
- `checkSupabaseHealth()` (`lib/health.ts`) is the connectivity probe for
  debugging now and the admin dashboard later.

## What NOT to log (permanent rules)

Phone numbers (use `maskPhone`), OTP codes, tokens, passwords, message text,
emails. The logger redacts known-sensitive keys automatically, but treat that
as a seatbelt, not permission.

/**
 * Crash/error reporting seam.
 *
 * Today: `ConsoleReporter` (structured log lines — nothing leaves the device).
 * Later: flip `EXPO_PUBLIC_ERROR_REPORTER=sentry`, add `@sentry/react-native`,
 * set the DSN — `getReporter()` picks `SentryReporter` with NO call-site
 * changes. The ambient type below keeps this file compiling without the
 * package installed; the dynamic import fails gracefully until then.
 */
import { config } from './config';
import { createLogger } from './logger';

const log = createLogger('reporting');

export interface ErrorReport {
  error: unknown;
  context?: Record<string, unknown>;
  /** Crash-level (ErrorBoundary) vs recoverable (caught API failure). */
  fatal?: boolean;
}

export interface ErrorReporter {
  readonly name: string;
  report(payload: ErrorReport): void;
  setUser(userId: string | null): void;
}

class ConsoleReporter implements ErrorReporter {
  readonly name = 'console';

  report({ error, context, fatal }: ErrorReport): void {
    log.error(fatal === true ? 'Fatal error captured.' : 'Error captured.', { error, ...context });
  }

  setUser(): void {
    // Console reporter has no user store — no-op by design.
  }
}

async function loadSentry(): Promise<typeof import('@sentry/react-native') | null> {
  try {
    // Optional dependency — unresolved until Sentry is installed (see types/sentry.d.ts).
    // eslint-disable-next-line import/no-unresolved
    return await import('@sentry/react-native');
  } catch {
    return null;
  }
}

let sentryWarned = false;

class SentryReporter implements ErrorReporter {
  readonly name = 'sentry';
  private ready = false;

  constructor() {
    void this.init();
  }

  private async init(): Promise<void> {
    const sdk = await loadSentry();
    if (sdk === null || config.sentryDsn === undefined) {
      if (!sentryWarned) {
        sentryWarned = true;
        log.warn('Sentry reporter selected but unavailable (missing package or DSN) — errors stay local.');
      }
      return;
    }
    sdk.init({ dsn: config.sentryDsn });
    this.ready = true;
  }

  report({ error, context, fatal }: ErrorReport): void {
    if (!this.ready) {
      new ConsoleReporter().report({ error, context, fatal });
      void this.init();
      return;
    }
    void loadSentry().then((sdk) => {
      sdk?.captureException(error, { extra: { ...context, fatal: fatal === true } });
    });
  }

  setUser(userId: string | null): void {
    void loadSentry().then((sdk) => {
      sdk?.setUser(userId === null ? null : { id: userId });
    });
  }
}

let cached: ErrorReporter | null = null;

/** Singleton chosen by `EXPO_PUBLIC_ERROR_REPORTER`. One config change swaps backends. */
export function getReporter(): ErrorReporter {
  if (cached === null)
    cached = config.errorReporter === 'sentry' ? new SentryReporter() : new ConsoleReporter();
  return cached;
}

/** Test hook — forget the cached reporter. */
export function resetReporter(): void {
  cached = null;
}

/** Report anywhere: `reportError(error, { where: 'discover/deck' })`. Never throws. */
export function reportError(error: unknown, context?: Record<string, unknown>, fatal = false): void {
  try {
    getReporter().report({ error, context, fatal });
  } catch {
    // Reporting must never crash the app — last-resort console line.
    console.error('[reporting] reporter itself failed.');
  }
}

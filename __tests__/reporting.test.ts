import { getReporter, reportError, resetReporter } from '../lib/reporting';
import { resetLogSink, setLogSink } from '../lib/logger';

afterEach(() => {
  resetReporter();
  resetLogSink();
});

describe('reporting seam (audit S6)', () => {
  it('defaults to the console reporter and never throws', () => {
    expect(getReporter().name).toBe('console');
    expect(() => reportError(new Error('boom'), { where: 'test' })).not.toThrow();
    expect(() => reportError(new Error('fatal'), undefined, true)).not.toThrow();
    expect(() => getReporter().setUser('u-1')).not.toThrow();
  });

  it('delegates to the console reporter with fatal flag intact', () => {
    const lines: string[] = [];
    setLogSink((_level, line) => {
      lines.push(line);
    });
    reportError(new Error('boom'), { where: 'test' }, true);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Fatal error captured.');
  });

  it('degrades gracefully when sentry is selected but unavailable', () => {
    const previous = process.env.EXPO_PUBLIC_ERROR_REPORTER;
    process.env.EXPO_PUBLIC_ERROR_REPORTER = 'sentry';
    let name = '';
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('../lib/reporting') as typeof import('../lib/reporting');
      mod.resetReporter();
      name = mod.getReporter().name;
      expect(() => mod.reportError(new Error('boom'))).not.toThrow();
      mod.resetReporter();
    });
    if (previous === undefined) delete process.env.EXPO_PUBLIC_ERROR_REPORTER;
    else process.env.EXPO_PUBLIC_ERROR_REPORTER = previous;
    expect(name).toBe('sentry');
  });
});

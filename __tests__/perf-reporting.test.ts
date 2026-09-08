import { setLogSink, resetLogSink, setMinLevel, type LogLevel } from '../lib/logger';
import { timed, timeSync } from '../lib/perf';
import { getReporter, reportError, resetReporter } from '../lib/reporting';

describe('perf markers', () => {
  const lines: string[] = [];
  beforeEach(() => {
    lines.length = 0;
    setMinLevel('debug');
    setLogSink((_level: LogLevel, line: string) => {
      lines.push(line);
    });
  });
  afterEach(() => {
    resetLogSink();
    setMinLevel('debug');
  });

  it('timed() returns the value and logs a duration', async () => {
    await expect(timed('auth.signin', async () => 42)).resolves.toBe(42);
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0] as string) as { msg: string; ctx: { durationMs: number } };
    expect(parsed.msg).toBe('perf:auth.signin');
    expect(parsed.ctx.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('timeSync() works for synchronous work', () => {
    expect(timeSync('seed', () => 'done')).toBe('done');
    expect(lines).toHaveLength(1);
  });
});

describe('reporting', () => {
  const lines: string[] = [];
  beforeEach(() => {
    lines.length = 0;
    resetReporter();
    setLogSink((_level: LogLevel, line: string) => {
      lines.push(line);
    });
  });
  afterEach(() => {
    resetLogSink();
    resetReporter();
  });

  it('defaults to the console reporter and never throws', () => {
    expect(getReporter().name).toBe('console');
    expect(() => reportError(new Error('boom'), { where: 'test' })).not.toThrow();
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] as string) as { level: string }).toMatchObject({ level: 'error' });
  });
});

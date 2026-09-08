import {
  createLogger,
  maskPhone,
  redact,
  resetLogSink,
  setLogSink,
  setMinLevel,
  type LogLevel,
} from '../lib/logger';

describe('maskPhone', () => {
  it('hides all but the country code and last two digits', () => {
    expect(maskPhone('+213555123456')).toBe('+213 ••• •• 56');
  });

  it('handles very short input without leaking', () => {
    expect(maskPhone('12')).toBe('••••');
  });
});

describe('redact', () => {
  it('redacts sensitive keys and masks phones, recursively', () => {
    expect(
      redact({
        token: 'secret',
        nested: { otp: '123456', phone: '+213555123456', safe: 'keep me' },
        list: [{ password: 'x', n: 1 }],
      }),
    ).toEqual({
      token: '[redacted]',
      nested: { otp: '[redacted]', phone: '+213 ••• •• 56', safe: 'keep me' },
      list: [{ password: '[redacted]', n: 1 }],
    });
  });
});

describe('logger sink', () => {
  const lines: string[] = [];
  beforeEach(() => {
    lines.length = 0;
    setLogSink((_level: LogLevel, line: string) => {
      lines.push(line);
    });
    setMinLevel('debug');
  });
  afterEach(resetLogSink);

  it('emits structured JSON with scope and redacted context', () => {
    createLogger('auth').warn('OTP throttled.', { phone: '+213555123456' });
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0] as string) as { level: string; scope: string; ctx: { phone: string } };
    expect(parsed.level).toBe('warn');
    expect(parsed.scope).toBe('auth');
    expect(parsed.ctx.phone).toBe('+213 ••• •• 56');
  });

  it('drops lines below the minimum level', () => {
    setMinLevel('error');
    createLogger('auth').info('hidden');
    createLogger('auth').error('shown');
    expect(lines).toHaveLength(1);
  });
});

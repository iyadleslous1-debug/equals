import { err, ok, toAppError, withRetry } from '../lib/result';

describe('ok / err', () => {
  it('wraps data in a success envelope', () => {
    expect(ok(42)).toEqual({ ok: true, data: 42 });
  });

  it('wraps code + message in an error envelope', () => {
    expect(err('auth/otp-invalid', 'Bad code')).toEqual({
      ok: false,
      error: { code: 'auth/otp-invalid', message: 'Bad code', details: undefined },
    });
  });
});

describe('toAppError', () => {
  it('normalises Error instances', () => {
    expect(toAppError(new Error('boom'), 'fallback')).toMatchObject({
      code: 'fallback',
      message: 'boom',
    });
  });

  it('keeps Supabase-style { code, message } payloads', () => {
    expect(toAppError({ code: '23505', message: 'duplicate' }, 'fallback')).toMatchObject({
      code: '23505',
      message: 'duplicate',
    });
  });

  it('handles strings and unknown values', () => {
    expect(toAppError('plain failure')).toMatchObject({ message: 'plain failure' });
    expect(toAppError(null, 'fallback')).toMatchObject({ code: 'fallback' });
  });
});

describe('withRetry', () => {
  it('returns on first success without retrying', async () => {
    const fn = jest.fn().mockResolvedValue('yes');
    await expect(withRetry(fn, { delayMs: 1 })).resolves.toBe('yes');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries transient failures then succeeds', async () => {
    const fn = jest.fn().mockRejectedValueOnce(new Error('flaky')).mockResolvedValue('recovered');
    await expect(withRetry(fn, { retries: 2, delayMs: 1 })).resolves.toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('gives up after the retry budget', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('down'));
    await expect(withRetry(fn, { retries: 1, delayMs: 1 })).rejects.toThrow('down');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('fails fast when shouldRetry refuses', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('denied'));
    await expect(withRetry(fn, { shouldRetry: () => false, delayMs: 1 })).rejects.toThrow('denied');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

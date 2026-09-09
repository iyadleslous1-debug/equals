import { AlgerianSmsProvider, DisabledSmsProvider, TwilioSmsProvider, createSmsProvider } from '../lib/sms';

describe('SMS providers (audit S6)', () => {
  it('Twilio path delegates to Supabase Auth with nothing to call', async () => {
    await expect(
      new TwilioSmsProvider().sendOtp({ toE164: '+213500000000', code: '123456' }),
    ).resolves.toEqual({
      ok: true,
      data: undefined,
    });
  });

  it('disabled path logs and resolves without delivering', async () => {
    await expect(
      new DisabledSmsProvider().sendOtp({ toE164: '+213500000000', code: '123456' }),
    ).resolves.toEqual({ ok: true, data: undefined });
  });

  it('factory defaults to disabled in the test env', () => {
    expect(createSmsProvider().name).toBe('disabled');
  });

  it('Algerian provider fails closed without credentials', async () => {
    const result = await new AlgerianSmsProvider('', '').sendOtp({
      toE164: '+213500000000',
      code: '123456',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('sms/not-configured');
  });

  it('Algerian provider refuses plaintext aggregator URLs', async () => {
    const result = await new AlgerianSmsProvider('http://sms.test', 'key-1').sendOtp({
      toE164: '+213500000000',
      code: '123456',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('sms/insecure-url');
  });

  it('Algerian provider posts the aggregator contract on success', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const realFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;
    try {
      const result = await new AlgerianSmsProvider('https://sms.test', 'key-1', 'DZ').sendOtp({
        toE164: '+213500000000',
        code: '654321',
      });
      expect(result.ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://sms.test/send',
        expect.objectContaining({ method: 'POST' }),
      );
      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as Record<string, string>;
      expect(body.api_key).toBe('key-1');
      expect(body.to).toBe('+213500000000');
      expect(body.from).toBe('DZ');
      expect(body.text).toContain('654321');
      expect(body.text).not.toContain('key-1');
    } finally {
      global.fetch = realFetch;
    }
  });

  it('Algerian provider surfaces rejection and network failure distinctly', async () => {
    const realFetch = global.fetch;
    try {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 502 }) as unknown as typeof fetch;
      const rejected = await new AlgerianSmsProvider('https://sms.test', 'key-1').sendOtp({
        toE164: '+213500000000',
        code: '1',
      });
      expect(rejected.ok).toBe(false);
      if (!rejected.ok) expect(rejected.error.code).toBe('sms/provider-error');

      global.fetch = jest.fn().mockRejectedValue(new Error('down')) as unknown as typeof fetch;
      const network = await new AlgerianSmsProvider('https://sms.test', 'key-1').sendOtp({
        toE164: '+213500000000',
        code: '1',
      });
      expect(network.ok).toBe(false);
      if (!network.ok) expect(network.error.code).toBe('sms/network');
    } finally {
      global.fetch = realFetch;
    }
  });
});

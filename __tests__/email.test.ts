import { signInWithPhone, verifyPhoneOtp } from '../lib/auth/phone';
import { MIN_PASSWORD_LENGTH, normalizeEmail, validatePassword } from '../lib/auth/validation';

describe('normalizeEmail', () => {
  it.each(['User@Example.COM', '  user@example.com  '])('normalises %s', (input) => {
    expect(normalizeEmail(input)).toEqual({ ok: true, data: 'user@example.com' });
  });

  it('rejects empty and malformed input', () => {
    expect(normalizeEmail('   ').ok).toBe(false);
    const missingTld = normalizeEmail('user@example');
    expect(missingTld.ok).toBe(false);
    if (!missingTld.ok) expect(missingTld.error.code).toBe('auth/email-invalid');
    expect(normalizeEmail('not an email').ok).toBe(false);
  });
});

describe('validatePassword', () => {
  it(`accepts passwords of ${MIN_PASSWORD_LENGTH}+ characters`, () => {
    expect(validatePassword('s3cure!!pass')).toEqual({ ok: true, data: 's3cure!!pass' });
  });

  it('rejects short passwords with a clear code', () => {
    const result = validatePassword('short');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('auth/password-weak');
  });
});

describe('phone stubs (not wired in MVP0)', () => {
  it('fails closed with a clear code for valid numbers', () => {
    expect(signInWithPhone('0555123456')).toEqual({
      ok: false,
      error: {
        code: 'auth/phone-not-enabled',
        message: 'Phone sign-in is coming later. Please use email for now.',
        details: undefined,
      },
    });
    expect(verifyPhoneOtp('0555123456').ok).toBe(false);
  });

  it('still validates number shape before failing closed', () => {
    const result = signInWithPhone('123');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('phone/invalid');
  });
});

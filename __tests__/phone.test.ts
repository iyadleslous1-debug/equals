import { normalizeDzPhone } from '../lib/phone';

describe('normalizeDzPhone', () => {
  it.each(['0555123456', '0555 12 34 56', '0555-12-34-56', '+213555123456', '213555123456'])(
    'normalises %s to E.164',
    (input) => {
      // NOTE: 0555 12 34 56 is a structurally-valid example, not a real subscriber.
      expect(normalizeDzPhone(input)).toEqual({ ok: true, data: '+213555123456' });
    },
  );

  it('rejects empty input', () => {
    const result = normalizeDzPhone('   ');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('phone/empty');
  });

  it('rejects malformed numbers', () => {
    const result = normalizeDzPhone('123');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('phone/invalid');
  });

  it('rejects non-Algerian numbers', () => {
    const result = normalizeDzPhone('+14155552671');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('phone/not-dz');
  });
});

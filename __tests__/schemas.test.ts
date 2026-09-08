import {
  messageSchema,
  parseWith,
  profileSchema,
  reportSchema,
  sanitizeText,
} from '../lib/validation/schemas';

describe('sanitizeText', () => {
  it('strips control characters but keeps newlines, tabs, Arabic and emoji', () => {
    expect(sanitizeText('Salam -benzema- emmène-moi 1')).toBe('Salam -benzema- emmène-moi 1');
    expect(sanitizeText('  hello\t\nworld  ')).toBe('hello\t\nworld');
    expect(sanitizeText('a\n\n\n\nb')).toBe('a\n\nb');
  });
});

describe('profileSchema', () => {
  const valid = { display_name: 'Amine', age: 25, gender: 'male', wilaya: 16 } as const;

  it('accepts a valid profile and coerces string numbers from form inputs', () => {
    expect(parseWith(profileSchema, { ...valid, age: '25', wilaya: '16', bio: 'Salam 👋' })).toEqual({
      ok: true,
      data: { display_name: 'Amine', age: 25, gender: 'male', wilaya: 16, bio: 'Salam 👋' },
    });
  });

  it('rejects under-18, bad wilaya and short names with readable messages', () => {
    expect(parseWith(profileSchema, { ...valid, age: 17 }).ok).toBe(false);
    const wilaya = parseWith(profileSchema, { ...valid, wilaya: 99 });
    expect(wilaya.ok).toBe(false);
    if (!wilaya.ok) expect(wilaya.error.code).toBe('validation/failed');
    const name = parseWith(profileSchema, { ...valid, display_name: 'A' });
    expect(name.ok).toBe(false);
    if (!name.ok) expect(name.error.message).toMatch(/2 caractères/);
  });
});

describe('messageSchema', () => {
  it('accepts normal text and rejects empty/oversized input', () => {
    expect(parseWith(messageSchema, { content: 'Salam, ça va ?' }).ok).toBe(true);
    expect(parseWith(messageSchema, { content: '   ' }).ok).toBe(false);
    expect(parseWith(messageSchema, { content: 'x'.repeat(1001) }).ok).toBe(false);
  });
});

describe('reportSchema', () => {
  it('requires a reason of 3+ characters', () => {
    expect(parseWith(reportSchema, { reason: 'Spam' }).ok).toBe(true);
    expect(parseWith(reportSchema, { reason: 'no' }).ok).toBe(false);
  });
});

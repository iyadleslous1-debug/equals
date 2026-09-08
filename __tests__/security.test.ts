import { isSafeExternalUrl } from '../lib/security';

describe('isSafeExternalUrl', () => {
  it('allows plain https URLs', () => {
    expect(isSafeExternalUrl('https://example.com/article')).toBe(true);
  });

  it('rejects http, protocol-relative and unparsable input', () => {
    expect(isSafeExternalUrl('http://example.com')).toBe(false);
    expect(isSafeExternalUrl('//example.com')).toBe(false);
    expect(isSafeExternalUrl('not a url')).toBe(false);
  });

  it('rejects embedded credentials', () => {
    expect(isSafeExternalUrl('https://user:pass@example.com')).toBe(false);
  });

  it('enforces the host allowlist including subdomains', () => {
    expect(isSafeExternalUrl('https://support.example.com/x', ['example.com'])).toBe(true);
    expect(isSafeExternalUrl('https://evil-example.com', ['example.com'])).toBe(false);
    expect(isSafeExternalUrl('https://other.org', ['example.com'])).toBe(false);
  });
});

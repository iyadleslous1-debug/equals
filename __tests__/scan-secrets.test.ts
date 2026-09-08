import { containsSecret } from '../scripts/scan-secrets.mjs';

describe('containsSecret', () => {
  it('flags private keys and provider tokens', () => {
    expect(containsSecret('key = "-----BEGIN PRIVATE KEY-----"', 'a.ts')).toEqual(['private key']);
    expect(containsSecret('x = "ghp_12345678901234567890"', 'a.ts')).toEqual(['GitHub token']);
    expect(
      containsSecret('SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.realkeymaterial', 'x'),
    ).toEqual(['assigned secret (KEY/SECRET/TOKEN/DSN) with real-looking value']);
  });

  it('ignores placeholders, examples and bare variable names', () => {
    expect(
      containsSecret(
        'EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
        '.env.example',
      ),
    ).toEqual([]);
    expect(containsSecret('SUPABASE_SERVICE_ROLE_KEY=', 'notes.md')).toEqual([]);
    expect(containsSecret('set SUPABASE_SERVICE_ROLE_KEY in shell env (test value xxx)', 'doc.md')).toEqual(
      [],
    );
    expect(
      containsSecret(
        "const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';",
        'scripts/seed-dev.mjs',
      ),
    ).toEqual([]);
    expect(containsSecret(`const SLOT = 'dzconnect.onboardingDraft';`, 'features/profile/draft.ts')).toEqual(
      [],
    );
  });

  it('skips its own source and the lockfile', () => {
    expect(containsSecret('ghp_12345678901234567890', 'scripts/scan-secrets.mjs')).toEqual([]);
    expect(containsSecret('ghp_12345678901234567890', 'package-lock.json')).toEqual([]);
    expect(containsSecret('ghp_12345678901234567890', '__tests__/scan-secrets.test.ts')).toEqual([]);
  });
});

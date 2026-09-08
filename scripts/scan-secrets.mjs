/**
 * Pre-commit / CI secret scanner — no binary required (gitleaks-compatible
 * upgrade path documented in `docs/secrets.md`).
 *
 * Usage:
 *   node scripts/scan-secrets.mjs            # scan staged files (pre-commit)
 *   node scripts/scan-secrets.mjs --all      # scan all tracked files (CI)
 *
 * Fails (exit 1) on high-confidence secret patterns. Deliberately
 * conservative: placeholder/example/test values are allowlisted so committed
 * templates (`.env.example`, docs) never trip it. When it fires, it prints
 * file:line — remove the secret, rewrite history if it was ever pushed
 * (`git filter-repo`), rotate the credential.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PATTERNS = [
  { name: 'private key', re: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { name: 'GitHub token', re: /\b(ghp|gho|github_pat)_[A-Za-z0-9_]{20,}/ },
  { name: 'AWS key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/ },
  {
    name: 'assigned secret (KEY/SECRET/TOKEN/DSN) with real-looking value',
    // Matches `FOO_SECRET_KEY=eyJ...` etc. Values containing marker words
    // (placeholder, example, test, seed, ...) are rejected below.
    // Runtime env reads (`KEY = process.env.FOO`) embed no secret, so they
    // are excluded via the negative lookahead.
    re: /\b[A-Z_]*(?:KEY|SECRET|TOKEN|DSN)\b\s*[:=]\s*(?!process\.env\b)['"]?([A-Za-z0-9_\-./+]{16,})['"]?/,
    valueIndex: 1,
  },
];

// Marker words that prove a matched value is a template, not a secret.
const VALUE_MARKERS = /placeholder|example|changeme|dummy|your-|test|xxx|seed|fake|dev-/i;

const SKIP_FILES = [
  'package-lock.json',
  'scripts/scan-secrets.mjs', // self: contains pattern source text
  '__tests__/scan-secrets.test.ts', // self-test: contains deliberate positive fixtures
];

export function containsSecret(content, filename) {
  if (SKIP_FILES.some((skip) => filename.endsWith(skip))) return [];
  const hits = [];
  for (const { name, re, valueIndex } of PATTERNS) {
    const match = re.exec(content);
    if (match === null) continue;
    if (valueIndex !== undefined && VALUE_MARKERS.test(match[valueIndex])) continue;
    hits.push(name);
  }
  return hits;
}

function listFiles(stagedOnly) {
  const args = stagedOnly ? ['diff', '--cached', '--name-only', '--diff-filter=ACMR'] : ['ls-files'];
  const out = execFileSync('git', args, { encoding: 'utf8' });
  return out
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean);
}

const stagedOnly = !process.argv.includes('--all');
let failures = 0;
for (const file of listFiles(stagedOnly)) {
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue; // deleted, binary, or unreadable — skip
  }
  const hits = containsSecret(content, file);
  for (const hit of hits) {
    failures += 1;
    console.error(`secret scanner: ${hit} suspected in ${file}`);
  }
}
if (failures > 0) {
  console.error('Remove the secret(s), rotate the credential, then commit again.');
  process.exit(1);
}
console.log(`secret scan passed (${stagedOnly ? 'staged' : 'tracked'} files).`);

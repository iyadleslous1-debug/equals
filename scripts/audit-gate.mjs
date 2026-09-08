/**
 * Dependency audit gate — fails CI on NEW high/critical vulnerabilities.
 *
 * Plain `npm audit --audit-level=high` is red from day one for reasons outside
 * this repo's control: every current high/critical sits in Expo/Metro build
 * TOOLING (never shipped in the app bundle — Metro, tar, postcss and
 * image-size execute on the dev machine/CI, not on user devices), and each
 * fix requires a breaking SDK/toolchain major. So this gate allowlists those
 * reviewed upstream advisories and fails on anything ELSE that appears.
 *
 * Maintenance: re-run `npm audit`, investigate newcomers, and either fix or
 * append with a dated rationale + review date. Never append app-runtime
 * advisories (supabase-js, react-query, expo-router runtime paths) — fix those.
 *
 * REVIEW BY 2026-12-08: re-check whether the Expo/Metro toolchain majors have
 * landed and these exceptions can be dropped. The gate prints a reminder once
 * this date passes (it still passes — the reminder is there so the list
 * doesn't silently rot for years).
 */
import { execFileSync } from 'node:child_process';

// Reviewed 2026-09-08, next review 2026-12-08. All three packages are build-time only:
//  - tar          via @expo/cli + cacache (npm cache). Fix = expo 57 major.
//  - postcss      via NativeWind/Tailwind build. Fix = breaking major.
//  - image-size   via Metro / react-native CLI tooling. Fix = breaking major.
const REVIEWED_ON = '2026-09-08';
const REVIEW_AFTER_DAYS = 90;
const ALLOWLIST = new Set([
  'https://github.com/advisories/GHSA-23hp-3jrh-7fpw', // tar
  'https://github.com/advisories/GHSA-34x7-hfp2-rc4v', // tar
  'https://github.com/advisories/GHSA-83g3-92jg-28cx', // tar
  'https://github.com/advisories/GHSA-8qq5-rm4j-mr97', // tar
  'https://github.com/advisories/GHSA-8x88-c5mf-7j5w', // tar
  'https://github.com/advisories/GHSA-9ppj-qmqm-q256', // tar
  'https://github.com/advisories/GHSA-qffp-2rhf-9h96', // tar
  'https://github.com/advisories/GHSA-r292-9mhp-454m', // tar
  'https://github.com/advisories/GHSA-r6q2-hw4h-h46w', // tar
  'https://github.com/advisories/GHSA-6g55-p6wh-862q', // postcss
  'https://github.com/advisories/GHSA-r28c-9q8g-f849', // postcss
  'https://github.com/advisories/GHSA-5p2g-fcmc-qvqq', // image-size
  'https://github.com/advisories/GHSA-w3rx-r6r6-pgpr', // image-size
]);

// `npm audit` exits 1 when findings exist — the JSON still arrives on stdout.
let raw;
try {
  raw = execFileSync('npm', ['audit', '--json'], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    // npm is a batch file on Windows, which requires a shell to spawn.
    shell: process.platform === 'win32',
  });
} catch (error) {
  const fallback = error?.stdout?.toString('utf8') ?? '';
  if (fallback === '') throw error;
  raw = fallback;
}
const report = JSON.parse(raw);
const found = new Map();
for (const entry of Object.values(report.vulnerabilities ?? {})) {
  for (const via of entry.via ?? []) {
    if (typeof via === 'string') continue;
    if (via.severity === 'high' || via.severity === 'critical') {
      if (!found.has(via.url))
        found.set(via.url, { pkg: via.name, title: via.title, severity: via.severity });
    }
  }
}

const unlisted = [...found.entries()].filter(([url]) => !ALLOWLIST.has(url));
if (unlisted.length > 0) {
  console.error('NEW high/critical advisories not in the audit allowlist:');
  for (const [url, info] of unlisted)
    console.error(` - [${info.severity}] ${info.pkg}: ${info.title}\n   ${url}`);
  console.error('Fix them, or append with a dated rationale in scripts/audit-gate.mjs.');
  process.exit(1);
}

// Expiry reminder — loud in CI logs, non-blocking by design.
const reviewBy = new Date(REVIEWED_ON);
reviewBy.setUTCDate(reviewBy.getUTCDate() + REVIEW_AFTER_DAYS);
if (new Date() > reviewBy) {
  console.warn(
    `audit gate: REVIEW DATE PASSED (${reviewBy.toISOString().slice(0, 10)}) — re-run npm audit, ` +
      'clear fixed items, and move REVIEWED_ON forward. See scripts/audit-gate.mjs.',
  );
}
console.log(`audit gate passed (${found.size} known upstream-toolchain advisories allowlisted, 0 new).`);

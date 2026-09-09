/**
 * Regenerate types/database.ts from the LOCAL stack.
 *
 * Why not `npm run gen:types` (--linked)? It hangs when the cloud project is
 * unreachable. Why not a shell redirect? PowerShell re-encodes stdout as
 * UTF-16, which corrupts the file (seen 2026-09-09: truncated + Bin diff).
 * Raw bytes here preserve the generator's UTF-8; prettier normalizes style.
 *
 * Usage: node scripts/gen-types-local.mjs
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const out = spawnSync('npx', ['supabase', 'gen', 'types', 'typescript', '--local'], {
  encoding: 'buffer',
  maxBuffer: 16 * 1024 * 1024,
  shell: true,
});
if (out.status !== 0 || !out.stdout || out.stdout.length === 0) {
  console.error(out.stderr?.toString('utf8') ?? 'typegen produced no output');
  process.exit(out.status ?? 1);
}
writeFileSync('types/database.ts', out.stdout);

const prettier = spawnSync('npx', ['prettier', '--write', 'types/database.ts'], {
  encoding: 'utf8',
  shell: true,
});
if (prettier.status !== 0) {
  console.error(prettier.stderr);
  process.exit(prettier.status ?? 1);
}
console.log('types/database.ts regenerated from local stack.');

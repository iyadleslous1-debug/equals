/**
 * Backup helper — timestamped `pg_dump` of a hosted Supabase project.
 *
 * Usage:
 *   SUPABASE_DB_URL='postgresql://postgres:[pw]@[ref].supabase.co:5432/postgres' \
 *     node scripts/backup.mjs --out ./backups --env staging
 *
 * Requires the Supabase CLI (`supabase --version`) for `db dump`, which handles
 * the Supabase-managed schemas correctly. The connection string comes from
 * shell env ONLY — never commit it, never put it in `.env` (that file feeds
 * the client bundle's key namespace; keep server credentials out of it).
 *
 * Output: `<out>/<env>-YYYYMMDD-HHmm.dump` + size + SHA-256 on stdout.
 * See `docs/backup-restore.md` for retention, restore, and the one-time drill.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync } from 'node:fs';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const envIndex = args.indexOf('--env');
const outDir = outIndex === -1 ? './backups' : (args[outIndex + 1] ?? './backups');
const envName = envIndex === -1 ? 'unknown' : (args[envIndex + 1] ?? 'unknown');

const dbUrl = process.env.SUPABASE_DB_URL ?? '';
if (dbUrl === '') {
  console.error('Set SUPABASE_DB_URL first (Dashboard → Database → Connection string).');
  process.exit(1);
}
if (/localhost|127\.0\.0\.1/.test(dbUrl)) {
  console.error('Refusing: this helper targets hosted projects. Local dev needs no backup.');
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13).replace('T', '-');
const file = `${outDir}/${envName}-${stamp}.dump`;
mkdirSync(outDir, { recursive: true });

try {
  execFileSync('supabase', ['db', 'dump', '--db-url', dbUrl, '-f', file], { stdio: 'inherit' });
} catch {
  console.error('Backup failed — is the Supabase CLI installed and the connection string valid?');
  process.exit(1);
}

const bytes = statSync(file).size;
const sha = createHash('sha256').update(readFileSync(file)).digest('hex');
console.log(`backup written: ${file} (${(bytes / 1024 / 1024).toFixed(1)} MB, sha256 ${sha.slice(0, 16)}…)`);
console.log('Next: copy it off this machine (see docs/backup-restore.md).');

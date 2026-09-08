# Backup & restore — hosted Supabase

Supabase's automatic backups (daily on paid tiers, PITR on Pro+) are a safety
net, not a verified plan. This doc is the plan. The restore drill below is a
**one-time manual step** — do it once against a scratch project, tick it off,
then rely on automation with confidence.

## What's covered by what

| Layer                                                           | How                                                | Restores                                       |
| --------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------- |
| Schema + RLS + functions                                        | `supabase/migrations/*` in git (source of truth)   | Fresh project via `supabase db push`           |
| App data (profiles, messages…)                                  | `scripts/backup.mjs` → timestamped `pg_dump` files | `psql < backup.sql` into scratch, then promote |
| Auth identities (`auth.users`)                                  | Included in the full `pg_dump` (custom format)     | Restored with data; passwords/hashes intact    |
| Edge-function secrets, dashboard settings, Auth email templates | NOT in dumps — re-apply manually                   | Keep a checklist in this file per environment  |

## Export (scripted)

```bash
# needs: supabase CLI + a DB connection string (Dashboard → Database → Connection string)
SUPABASE_DB_URL='postgresql://postgres:[pw]@[ref].supabase.co:5432/postgres' \
  node scripts/backup.mjs --out ./backups
```

Produces `backups/<env>-YYYYMMDD-HHmm.dump` (custom format: schema + data) and
prints size + SHA-256. Copy it somewhere that isn't your laptop (external
drive / encrypted bucket). Retention: keep weekly ×4, monthly ×3.

## Restore drill (ONE-TIME, manual, ~30 min) — ☐ NOT DONE YET

1. Create a **fresh scratch** Supabase project (free tier is fine).
2. `supabase link --project-ref <scratch-ref>` in a scratch clone (don't
   relink your working copy — or relink back afterwards).
3. Apply migrations: `supabase db push` → verify tables/policies exist.
4. Restore data: `pg_restore --clean --if-exists -d <scratch-db-url> backups/<latest>.dump`.
5. Verify: row counts per table match prod (`SELECT count(*)` ×9), log in with
   a test account, read a conversation, confirm RLS denies cross-user reads.
6. Record here: date, who, backup file, result. Then delete the scratch project.

Until this box is ticked, "we have backups" is a hope, not a fact.

## Restore for real (incident)

Same steps 1–5 against the replacement project, then point the app at the new
URL/anon key (`.env.production` + EAS secrets), force-update clients, and
post-mortem within a week. RTO target: same day. RPO target: last nightly dump
(PITR closes this on paid tiers — enable it before launch).

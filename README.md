# DZ Connect — MVP0 foundation

Social discovery for Algeria. This milestone is **foundation only**: project
scaffolding, Supabase schema + RLS, email auth, hardening (envs, validation,
rate limits, error boundaries, observability seams), and conventions.
No feature screens yet (see `app/index.tsx` placeholder).

## Stack

Expo (SDK 52) + TypeScript strict · Expo Router · NativeWind · Zustand (client
state) · React Query (server state) · Supabase (Postgres + Auth) · Jest ·
ESLint + Prettier + Husky · GitHub Actions CI.

## Quick start

```bash
npm install
cp .env.example .env        # then fill in Supabase URL + anon key
npx supabase start          # local backend (needs Supabase CLI + Docker)
npx expo start
```

Useful scripts: `lint`, `typecheck`, `test`, `test:ci`, `gen:types` (regen
`types/database.ts` from the linked project), `db:new`, `db:reset`,
`seed:dev` (populate local backend with fake DZ users — needs
`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in shell env, never in `.env`).

## Environments

Three environments, zero hardcoded values. Everything switches through env
vars; `lib/config.ts` is the single reader.

| File (committed template) | `EXPO_PUBLIC_APP_ENV` | Points at                                                                                                             |
| ------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `.env.development`        | `development`         | Dev Supabase project (or `http://localhost:54321` via `supabase start` — loopback HTTP is allowed outside production) |
| `.env.staging`            | `staging`             | Staging project (doesn't exist yet)                                                                                   |
| `.env.production`         | `production`          | Production project (doesn't exist yet)                                                                                |

**Switching procedure:**

```bash
cp .env.staging .env        # pick one; .env is gitignored, templates stay clean
# ...paste the real URL + anon key into .env...
npx expo start -c           # -c clears the Metro cache so new vars load
```

> **Precedence trap (learned the hard way):** Expo resolves dotenv files with
> `.env.development` overriding `.env`, and `.env.local` overriding both.
> Real machine-specific values (like your LAN IP for Expo Go) belong in
> gitignored `.env.local` — otherwise the committed placeholder templates
> silently win and the app talks to the wrong backend. `lib/config.ts`
> additionally allows private-LAN `http://` outside production for exactly
> this device-testing case (production stays https-only).

For EAS builds, set the same `EXPO_PUBLIC_*` keys per profile in
`eas.json` (create when needed) instead of committing values.

**Failure policy** (enforced in `lib/config.ts`, tested in
`__tests__/config.test.ts`):

- Missing/invalid required vars (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, bad
  enums) → **throw at startup in every env**.
- `APP_ENV=production` additionally refuses localhost/placeholder URLs or
  keys, and requires `SENTRY_DSN` when the sentry reporter is selected.
- Missing optional vars (`SENTRY_DSN`, `POSTHOG_KEY`) → **warn once at
  startup in dev/staging, never throw**. Production stays silent.
- Log verbosity defaults per env (`debug`/`info`/`warn`); override anytime
  with `EXPO_PUBLIC_LOG_LEVEL`.

## Layout

```
app/            Expo Router routes (placeholder only in MVP0)
components/     shared presentational UI (rules in its README)
features/       feature modules — anatomy documented in its README
lib/            supabase client, auth, sms, config, result, logger, query-client
hooks/          shared hooks (useSupabaseAuth)
store/          Zustand client state (session mirror)
types/          generated DB types + domain aliases (npm run gen:types)
constants/      wilayas (58), app constants
supabase/       config.toml, migrations (schema + RLS), seed
__tests__/      unit tests for pure modules
```

## Conventions

Read `CONTRIBUTING.md` before adding code — naming, feature anatomy, commit
format, and the migration + RLS checklist.

## Supabase

- Migrations are the source of truth — no dashboard SQL. `0001` creates the 9
  tables (+ FKs, indexes, CHECKs, auth-user trigger); `0002` enables RLS on all
  9 and installs the policy set (see migration header for the inventory).
- `seed.sql` is intentionally user-free (rows must map to real auth identities).
- Auth is email + password (free) with Supabase's built-in email confirmation —
  entry points in `lib/auth/` (`email.ts` live, `phone.ts` stubbed). Phone/OTP
  can ship later without touching the schema: `users.phone_number` is already
  nullable + unique and the signup trigger already stores `NEW.phone` when
  present. SMS contracts stay dormant in `lib/sms.ts`; resend abuse controls in
  `lib/otp-throttle.ts`.

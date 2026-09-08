# Secrets management — where every credential lives

Rule of thumb: if it grants access, it never touches git, logs, or the client
bundle beyond the minimum audience that needs it. The full inventory:

## Credential inventory

| Secret                              | Audience                                             | Lives in                                      | Never in                                                     |
| ----------------------------------- | ---------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| `EXPO_PUBLIC_SUPABASE_URL`          | App (public identifier)                              | `.env` / EAS / GitHub Secrets                 | git history with real values (templates only)                |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`     | App bundle (public by design — RLS is the real lock) | `.env` / EAS / GitHub Secrets                 | — (safe to expose, still keep tidy)                          |
| `SUPABASE_SERVICE_ROLE_KEY`         | Server-side scripts ONLY (`scripts/seed-dev.mjs`)    | Shell env on your machine, Supabase dashboard | App code, `EXPO_PUBLIC_*`, git, CI logs. CI greps for leaks. |
| `EXPO_PUBLIC_SENTRY_DSN`            | App bundle (public-ish, abuse-limited)               | `.env` / EAS / GitHub Secrets                 | —                                                            |
| `ALGERIAN_SMS_*` (future)           | Edge functions only                                  | Supabase function secrets                     | `EXPO_PUBLIC_*` (client-visible!)                            |
| EAS / Apple / Google creds (future) | Build service                                        | EAS servers                                   | git                                                          |

## Local development

- Copy a template (`.env.development` etc.) to `.env` (gitignored) and paste
  real values. Never `git add .env` — if you do, rotate the credential and
  rewrite history; don't just delete the file in a later commit.
- Pre-commit runs `scripts/scan-secrets.mjs` (staged files). CI re-scans all
  tracked files. Both fail loudly on private keys, provider tokens, and
  assigned secrets with real-looking values. Upgrade path: drop in the
  [gitleaks](https://github.com/gitleaks/gitleaks) pre-commit hook + GitHub
  Action when the team grows — the custom script stays as the offline fallback.

## CI/CD (GitHub Actions → EAS, when deploys start)

1. Store each environment's values as
   [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
   (e.g. `STAGING_SUPABASE_URL`, `PROD_SUPABASE_ANON_KEY`), one set per
   environment — never reuse staging keys in prod.
2. Deploy jobs inject them as step `env:` vars; the build substitutes
   `EXPO_PUBLIC_*` at bundle time. Secrets print masked in logs automatically —
   additionally never `echo` them or pass them as Metro/CLI arguments that get
   logged (use env files or stdin).
3. The service-role key is NEVER a GitHub Secret consumed by the app build. If
   a workflow ever needs it (it doesn't today), scope it to a single reviewed
   step with minimal permissions and rotate afterwards.
4. EAS: `eas secret:push --scope project --env-file .env.production` per
   channel; verify with `eas secret:list` that staging/prod don't share values.

## Rotation

- Suspected leak (scanner fires, key pasted in chat, ex-employee): rotate in
  the Supabase dashboard FIRST (new anon/service keys are one click), then
  update `.env`/EAS/GitHub Secrets, then investigate history.
- Scheduled: rotate service-role yearly; calendar it with the audit-gate
  review date (`scripts/audit-gate.mjs`).

# Migration rollback plan

The Supabase CLI has no `down` migrations — reversals are manual, newest-first,
and always against a **backup first** (`supabase db dump -f backup.sql`). Each
section below is idempotent (`IF EXISTS`) and ordered so dependents drop before
parents. Test every reversal on a scratch branch (`supabase db reset` on a
copy), never on the shared staging project directly.

## 0011 + 0012 chat guards & previews

Reverses: block-lock + message rate triggers, conversation previews fn.

```sql
DROP TRIGGER IF EXISTS messages_rate_limit ON public.messages;
DROP TRIGGER IF EXISTS messages_block_lock ON public.messages;
DROP FUNCTION IF EXISTS public.enforce_message_rate_limit();
DROP FUNCTION IF EXISTS public.enforce_block_lock();
REVOKE ALL ON FUNCTION public.get_conversation_previews() FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.get_conversation_previews();
```

Data impact: none. Without the triggers, blocked chats become writable and
message sends unthrottled until re-applied — emergency-only.

## 0013 `20260908172614_chat-ordering.sql`

Reverses: deterministic ordering, single-source last message, P0002 lock
code. Re-apply 0011/0012 bodies (kept in git history) to restore — there is
no down-migration beyond re-running the prior file contents.

## 0009 `20260908133538_requests-inbox.sql`

Reverses: inbox definer function (read path only).

```sql
REVOKE ALL ON FUNCTION public.get_request_inbox() FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.get_request_inbox();
```

Data impact: none. The Requests screens lose counterpart display data until
re-applied (RLS owner-only profiles cannot substitute).

## 0010 `20260908143316_inbox-hardening.sql`

Reverses: profile-less null tolerance, dead/suspended/blocked exclusion,
stable ordering. Re-apply 0009 (kept in git history) to restore.

## 0007 `20260908063210_discovery.sql`

Reverses: deck function + swipe/request rate triggers.

```sql
DROP TRIGGER IF EXISTS friend_requests_rate_limit ON public.friend_requests;
DROP TRIGGER IF EXISTS swipe_actions_rate_limit ON public.swipe_actions;
DROP FUNCTION IF EXISTS public.enforce_request_rate_limit();
DROP FUNCTION IF EXISTS public.enforce_swipe_rate_limit();
DROP FUNCTION IF EXISTS public.get_discovery_candidates(INTEGER);
```

Data impact: none (read path + guards only). Without the triggers, send-heavy
actions are unthrottled until re-applied — treat as emergency-only.

## 0008 `20260908124039_discovery-limits.sql`

Reverses: deck limit clamp ([1,50] + NULL→20) and the least-privilege
`REVOKE FROM PUBLIC, anon` on the deck function. Re-apply 0007 (kept in git
history) to restore — the clamp and REVOKE live only in this file.

## 0006 `20260908042827_photo-hardening.sql`

Reverses: moderation self-write trigger + atomic card-switch function.

```sql
DROP TRIGGER IF EXISTS profile_photos_moderation_guard ON public.profile_photos;
DROP FUNCTION IF EXISTS public.forbid_moderation_self_write();
DROP FUNCTION IF EXISTS public.set_card_photo(UUID);
```

Data impact: none (guardrails only — rows, objects and flags are untouched).

## 0005 `20260908040723_profile-photos.sql`

Reverses: moderation column + private bucket policies + bucket. Uploaded
objects first (or the bucket delete fails on non-empty buckets).

```sql
-- objects first, then policies, then the bucket, then the column
DELETE FROM storage.objects WHERE bucket_id = 'profile-photos';
DROP POLICY IF EXISTS profile_photos_select_own ON storage.objects;
DROP POLICY IF EXISTS profile_photos_insert_own ON storage.objects;
DROP POLICY IF EXISTS profile_photos_update_own ON storage.objects;
DROP POLICY IF EXISTS profile_photos_delete_own ON storage.objects;
DELETE FROM storage.buckets WHERE id = 'profile-photos';
ALTER TABLE public.profile_photos DROP COLUMN IF EXISTS moderation_status;
```

Data impact: all stored photo objects are destroyed while `profile_photos`
rows survive with dangling `url` paths (only the column drops, not the
rows). Only for throwaway environments.

## 0004 `20260908000400_round3_abuse_privacy.sql`

Reverses: extended allowlist wording (function body) + the view.

```sql
DROP VIEW IF EXISTS public.active_profiles;
-- restore the 5-action allowlist version of check_rate_limit by re-running
-- the CREATE OR REPLACE block from 0003 with the shorter IN-list
-- (copy it verbatim from supabase/migrations/20260908000300_mvp0_hardening.sql).
```

Data impact: none. The view stores no data; the function body change only
widens/narrows which action names are accepted (buckets already recorded keep
working — keys are `auth.uid():action` strings, unaffected).

## 0003 `20260908000300_mvp0_hardening.sql`

Reverses: rate limiting, request state machine, soft-delete column.

```sql
-- triggers first
DROP TRIGGER IF EXISTS friend_requests_transition ON public.friend_requests;
DROP FUNCTION IF EXISTS public.guard_request_transition();
-- rate limiting (revoke before drop so no session holds it)
REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM authenticated;
DROP FUNCTION IF EXISTS public.check_rate_limit(TEXT, INTEGER, INTEGER);
DROP TABLE IF EXISTS public.rate_limits;
-- soft delete
DROP FUNCTION IF EXISTS public.is_active();
ALTER TABLE public.users DROP COLUMN IF EXISTS deleted_at;
```

Data impact: `rate_limits` rows are ephemeral counters — safe to lose.
`deleted_at` is metadata; `account_status` (from 0001) is untouched, so nothing
un-deletes or re-deletes. `responded_at` values already stamped stay as-is.

## 0002 `20260908000200_auth_email.sql`

Reverses: nullable phone + email-aware trigger. **Only reverse if zero
email-only users exist** (check: `SELECT count(*) FROM public.users WHERE
phone_number IS NULL;` — must be 0, otherwise the re-added NOT NULL fails).

```sql
-- restore the phone-only trigger + constraint
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, phone_number)
  VALUES (NEW.id, COALESCE(NEW.phone, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

ALTER TABLE public.users ALTER COLUMN phone_number SET NOT NULL;
```

## 0001 `20260908000100_mvp0_rls.sql`

Reverses: all policies + helper. The database keeps working (tables intact)
but **every table becomes openly readable/writable to authenticated users**
until re-applied — treat this as an emergency-only step (e.g. a bad policy
locks everyone out; prefer fixing forward with a new migration).

```sql
-- drop every policy (generated list — keep in sync with the migration)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', r.policyname, r.tablename);
  END LOOP;
END $$;
DROP FUNCTION IF EXISTS public.is_conversation_participant(UUID);
-- NOTE: this leaves RLS *enabled with zero policies* (deny-all). To fully
-- restore open access (NOT recommended): ALTER TABLE ... DISABLE ROW LEVEL SECURITY;
```

## 0000 `20260908000000_mvp0_core.sql`

Full schema teardown. **Destructive — all user data is lost.** Only for
throwaway environments.

```sql
DROP TRIGGER IF EXISTS messages_touch_conversation ON public.messages;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
DROP FUNCTION IF EXISTS public.touch_conversation();
DROP FUNCTION IF EXISTS public.handle_new_auth_user();
DROP FUNCTION IF EXISTS public.set_updated_at();
DROP TABLE IF EXISTS public.blocks, public.reports, public.messages,
  public.conversations, public.friend_requests, public.swipe_actions,
  public.profile_photos, public.profiles, public.users;
```

`auth.users` rows are NOT touched by any reversal (auth identities outlive
app rows; deleting them orphans Storage/Auth logs — do it only via Dashboard
→ Authentication with a written reason).

## Physical erasure (GDPR-style, admin-only)

Soft-delete (`account_status='deleted'`) is the app path. True erasure is a
two-person admin operation: export the user's rows for the legal record, then

```sql
-- cascades through profiles/photos/swipes/requests/convos/messages/reports/blocks
DELETE FROM public.users WHERE id = '<uuid>';
```

Record every erasure with date, reason and approver outside the database.

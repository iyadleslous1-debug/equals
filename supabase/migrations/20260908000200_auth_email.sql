-- ============================================================================
-- MVP0 · email+password becomes the primary auth method.
-- ============================================================================
-- What changes:
--  * `users.phone_number` becomes NULLABLE. Email signups have no phone, so
--    the column must accept NULL. The UNIQUE constraint stays: Postgres treats
--    NULLs as distinct, so any number of phoneless rows coexist while future
--    phone numbers stay globally unique.
--  * `handle_new_auth_user()` stores `NEW.phone` only when present, so email
--    signups insert cleanly today and phone/OTP signups reuse the SAME trigger
--    and table tomorrow — no restructure needed.
--
-- What does NOT change: RLS (identity is still `auth.uid()`), PKs, FKs.
-- ============================================================================

ALTER TABLE public.users
  ALTER COLUMN phone_number DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, phone_number)
  VALUES (NEW.id, NULLIF(NEW.phone, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

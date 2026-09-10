-- ============================================================================
-- UI completion – blocked list: my blocks with display names.
--
-- profile rows are own-row (a viewer cannot SELECT a stranger's profile),
-- so the name lookup happens inside this definer. Returns ONLY
-- (blocked_id, display_name) for rows I blocked — nothing about anyone else.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_blocks()
RETURNS TABLE (
  blocked_id UUID,
  display_name VARCHAR(40)
)
AS $$
  SELECT b.blocked_id, p.display_name
  FROM public.blocks b
  JOIN public.profiles p ON p.user_id = b.blocked_id
  WHERE b.blocker_id = auth.uid()
  ORDER BY b.created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.get_my_blocks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_blocks() TO authenticated, service_role;

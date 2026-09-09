-- ============================================================================
-- MVP2 – profile-detail gallery: the ONLY stranger read path for full photo
-- lists (profile_photos RLS stays own-row by design).
--
-- Mirrors the deck exclusions exactly: self, blocks either direction,
-- non-active owners (deleted/suspended via active_profiles), and rejected
-- photos. Pending photos are included — same interim rule as the deck card.
-- Returns storage paths only (client signs URLs); no ids, no flags.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_profile_gallery(p_user_id UUID)
RETURNS TABLE (
  url TEXT,
  is_card_photo BOOLEAN,
  order_index INTEGER
)
AS $$
  SELECT ph.url, ph.is_card_photo, ph.order_index
  FROM public.profile_photos ph
  JOIN public.active_profiles ap ON ap.id = ph.profile_id
  WHERE ap.user_id = p_user_id
    AND ap.user_id <> auth.uid()
    AND ph.moderation_status <> 'rejected'
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = ap.user_id)
         OR (b.blocker_id = ap.user_id AND b.blocked_id = auth.uid())
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.swipe_actions s
      WHERE (s.swiper_id = auth.uid() AND s.swiped_id = ap.user_id)
         OR (s.swiper_id = ap.user_id AND s.swiped_id = auth.uid())
    )
  ORDER BY ph.is_card_photo DESC, ph.order_index;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.get_profile_gallery(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_gallery(UUID) TO authenticated, service_role;

import { supabase } from '@/lib/supabase';
import { getCurrentUserId as currentUserId } from '@/lib/auth';
import { err, ok, toAppError, type ApiResult } from '@/lib/result';

export interface DeckProfile {
  user_id: string;
  display_name: string;
  age: number;
  gender: string;
  wilaya: number;
  bio: string | null;
  card_photo_url: string | null;
}

export interface DbError {
  code?: string | null;
  message?: string | null;
}

/**
 * Map Postgres/trigger failures to UI states. The double-tap race lands here
 * as 23505 (benign: the first tap already recorded) and trigger denials as
 * P0001 rate_limited (visible throttle, never silent).
 */
export function mapDbError(error: DbError | null): { code: string; message: string } {
  if (error?.code === '23505') {
    return { code: 'discover/already-recorded', message: 'Already recorded.' };
  }
  if (typeof error?.message === 'string' && /rate_limited/i.test(error.message)) {
    return { code: 'discover/rate-limited', message: 'Slow down a bit, then try again.' };
  }
  return { code: 'discover/action-failed', message: 'Something went wrong. Try again.' };
}

/** Deck for the signed-in viewer — exclusions enforced in SQL, not in app code. */
export async function fetchDeck(limit = 20): Promise<ApiResult<DeckProfile[]>> {
  const { data, error } = await supabase.rpc('get_discovery_candidates', { p_limit: limit });
  if (error !== null || data === null) {
    return err('discover/deck-failed', "Couldn't load discovery. Try again.", toAppError(error));
  }
  return ok(data as DeckProfile[]);
}

async function recordSwipe(
  swiperId: string,
  swipedId: string,
  action: 'skip' | 'request',
): Promise<ApiResult<void>> {
  const { error } = await supabase
    .from('swipe_actions')
    .insert({ swiper_id: swiperId, swiped_id: swipedId, action });
  if (error !== null) {
    if (error.code === '23505') return ok(undefined);
    const mapped = mapDbError(error);
    return err(mapped.code, mapped.message, toAppError(error));
  }
  return ok(undefined);
}

/**
 * Friend request = swipe row FIRST (UNIQUE pair is the double-tap backstop),
 * then the request row. Idempotent: an already-recorded pair (same-direction
 * double tap, or retry after a partial failure) returns success so the deck
 * advances instead of stranding the card on an error.
 */
export async function sendRequest(targetUserId: string): Promise<ApiResult<void>> {
  const user = await currentUserId();
  if (!user.ok) return user;
  const swiped = await recordSwipe(user.data, targetUserId, 'request');
  if (!swiped.ok) return swiped;
  const { error } = await supabase
    .from('friend_requests')
    .insert({ sender_id: user.data, receiver_id: targetUserId });
  if (error !== null) {
    if (error.code === '23505') return ok(undefined);
    const mapped = mapDbError(error);
    return err(mapped.code, mapped.message, toAppError(error));
  }
  return ok(undefined);
}

export async function skipProfile(targetUserId: string): Promise<ApiResult<void>> {
  const user = await currentUserId();
  if (!user.ok) return user;
  return recordSwipe(user.data, targetUserId, 'skip');
}

import { supabase } from '@/lib/supabase';
import { createLogger } from '@/lib/logger';
import { getCurrentUserId } from '@/lib/auth';
import { err, ok, toAppError, type ApiResult } from '@/lib/result';
import { canonicalPair } from '@/lib/pair';
import type { Database } from '@/types/database';

const log = createLogger('requests/api');

export type RequestRow = Database['public']['Tables']['friend_requests']['Row'];

export interface InboxItem {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  direction: 'received' | 'sent';
  counterpart: {
    user_id: string;
    display_name: string;
    age: number | null;
    wilaya: number | null;
    card_photo_url: string | null;
  } | null;
}

interface InboxRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  direction: string;
  counterpart_user_id: string | null;
  counterpart_name: string | null;
  counterpart_age: number | null;
  counterpart_wilaya: number | null;
  counterpart_card: string | null;
}

/** Inbox for the signed-in user — counterpart data included by the definer fn. */
export async function fetchInbox(): Promise<ApiResult<InboxItem[]>> {
  const { data, error } = await supabase.rpc('get_request_inbox');
  if (error !== null || data === null) {
    return err('requests/inbox-failed', "Couldn't load requests. Try again.", toAppError(error));
  }
  const items: InboxItem[] = [];
  for (const row of data as InboxRow[]) {
    if (row.direction !== 'received' && row.direction !== 'sent') {
      log.warn('Dropping inbox row with unknown direction.', { id: row.id });
      continue;
    }
    items.push({
      id: row.id,
      sender_id: row.sender_id,
      receiver_id: row.receiver_id,
      status: row.status,
      created_at: row.created_at,
      direction: row.direction,
      counterpart:
        row.counterpart_user_id === null || row.counterpart_name === null
          ? null
          : {
              user_id: row.counterpart_user_id,
              display_name: row.counterpart_name,
              age: row.counterpart_age,
              wilaya: row.counterpart_wilaya,
              card_photo_url: row.counterpart_card,
            },
    });
  }
  return ok(items);
}

/**
 * Mutual accept (decision (a)): flips every pending row in BOTH directions,
 * then gets-or-creates the canonical conversation. Accepting twice (or the
 * mirror arriving mid-tap) converges: already-accepted rows make the updates
 * no-ops and the conversation lookup idempotent.
 */
export async function acceptRequest(requestId: string): Promise<ApiResult<{ conversationId: string }>> {
  const { data: row, error: readError } = await supabase
    .from('friend_requests')
    .select('id,sender_id,receiver_id,status')
    .eq('id', requestId)
    .single();
  if (readError !== null || row === null) {
    return err('requests/not-found', 'Request not found.', toAppError(readError));
  }
  const user = await getCurrentUserId();
  if (!user.ok) return user;
  if (user.data !== row.receiver_id || row.status !== 'pending') {
    if (row.status === 'accepted') {
      const existing = await findConversation(row.sender_id, row.receiver_id);
      if (existing.ok) return ok({ conversationId: existing.data });
    }
    return err('requests/not-pending', 'Cette demande n’est plus en attente.');
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(row.sender_id) || !UUID_RE.test(row.receiver_id)) {
    return err('requests/not-found', 'Request not found.');
  }
  const { data: flipped, error: acceptError } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted' })
    .or(
      `and(sender_id.eq.${row.sender_id},receiver_id.eq.${row.receiver_id}),and(sender_id.eq.${row.receiver_id},receiver_id.eq.${row.sender_id})`,
    )
    .eq('status', 'pending')
    .select('id');
  if (acceptError !== null) {
    // Lost the race after all (trigger guard fired on a flipped row):
    // converge instead of erroring — refresh, don't retry a terminal row.
    if (acceptError.code === '25001') {
      return err('requests/not-pending', 'Cette demande n’est plus en attente.');
    }
    return err('requests/accept-failed', "Couldn't accept. Try again.", toAppError(acceptError));
  }
  if ((flipped ?? []).length === 0) {
    // Nothing was pending anymore (declined/canceled between read and write —
    // the eq-pending filter means the trigger never fired). Re-read: an
    // accepted pair still yields its conversation; otherwise stay honest.
    const { data: current } = await supabase
      .from('friend_requests')
      .select('sender_id,receiver_id,status')
      .eq('id', requestId)
      .single();
    if (current?.status === 'accepted') {
      const existing = await findConversation(current.sender_id, current.receiver_id);
      if (existing.ok) return ok({ conversationId: existing.data });
    }
    return err('requests/not-pending', 'Cette demande n’est plus en attente.');
  }
  const convo = await findConversation(row.sender_id, row.receiver_id);
  if (!convo.ok) return convo;
  return ok({ conversationId: convo.data });
}

async function findConversation(a: string, b: string): Promise<ApiResult<string>> {
  const [x, y] = canonicalPair(a, b);
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('participant_a_id', x)
    .eq('participant_b_id', y)
    .maybeSingle();
  if (existing) return ok(existing.id);
  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ participant_a_id: x, participant_b_id: y })
    .select('id')
    .single();
  if (error !== null || created === null) {
    // Lost the race with the mirror accept — the row exists now.
    if (error?.code === '23505') {
      const retry = await supabase
        .from('conversations')
        .select('id')
        .eq('participant_a_id', x)
        .eq('participant_b_id', y)
        .single();
      if (retry.data) return ok(retry.data.id);
    }
    return err('requests/convo-failed', "Couldn't open conversation. Try again.", toAppError(error));
  }
  return ok(created.id);
}

/** Decline is personal: only the acted row flips, the mirror (if any) stays. */
export async function declineRequest(requestId: string): Promise<ApiResult<void>> {
  const user = await getCurrentUserId();
  if (!user.ok) return user;
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'declined' })
    .eq('id', requestId)
    .eq('receiver_id', user.data)
    .eq('status', 'pending');
  if (error !== null) {
    return err('requests/decline-failed', "Couldn't decline. Try again.", toAppError(error));
  }
  return ok(undefined);
}

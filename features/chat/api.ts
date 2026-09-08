import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { getCurrentUserId as currentUserId } from '@/lib/auth';
import { err, ok, toAppError, type ApiResult } from '@/lib/result';
import { parseWith, messageSchema } from '@/lib/validation/schemas';
import type { Database } from '@/types/database';

export type MessageRow = Database['public']['Tables']['messages']['Row'];
export type ConversationRow = Database['public']['Tables']['conversations']['Row'];

export interface ConversationPreview {
  conversationId: string;
  otherUserId: string;
  otherName: string | null;
  otherAge: number | null;
  otherWilaya: number | null;
  otherCard: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
}

interface PreviewRow {
  conversation_id: string;
  other_user_id: string;
  other_name: string | null;
  other_age: number | null;
  other_wilaya: number | null;
  other_card: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread: number | string;
}

export const MESSAGE_PAGE_SIZE = 50;

/** Single-line preview with ellipsis. */
export function previewText(text: string, max = 60): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}

const uuidSchema = z.string().uuid();

export function isConversationId(value: string): boolean {
  return uuidSchema.safeParse(value).success;
}

function assertConversationId(conversationId: string): ApiResult<void> {
  if (!isConversationId(conversationId)) {
    return err('chat/not-found', 'Conversation introuvable.');
  }
  return ok(undefined);
}

/**
 * My conversations with counterpart display data + last message + unread —
 * one rpc (profiles are owner-only under RLS, so no client join possible).
 */
export async function listConversations(): Promise<ApiResult<ConversationPreview[]>> {
  const { data, error } = await supabase.rpc('get_conversation_previews');
  if (error !== null || data === null) {
    return err('chat/list-failed', 'Conversations illisibles. Réessayez.', toAppError(error));
  }
  return ok(
    (data as PreviewRow[]).map((row) => ({
      conversationId: row.conversation_id,
      otherUserId: row.other_user_id,
      otherName: row.other_name,
      otherAge: row.other_age,
      otherWilaya: row.other_wilaya,
      otherCard: row.other_card,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at,
      unread: typeof row.unread === 'string' ? Number.parseInt(row.unread, 10) : (row.unread ?? 0),
    })),
  );
}

export interface MessageCursor {
  created_at: string;
  id: string;
}

export async function fetchMessages(
  conversationId: string,
  before?: MessageCursor,
): Promise<ApiResult<MessageRow[]>> {
  const valid = assertConversationId(conversationId);
  if (!valid.ok) return valid;
  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(MESSAGE_PAGE_SIZE);
  if (before !== undefined) {
    // Keyset on (created_at, id) - timestamp-only cursors skip same-ms ties.
    query = query.or(
      `created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`,
    );
  }
  const { data, error } = await query;
  if (error !== null || data === null) {
    return err('chat/messages-failed', 'Messages illisibles. Réessayez.', toAppError(error));
  }
  return ok(data);
}

/** Client-validated first (zod), server-guarded second (length CHECK, block-lock, rate). */
export async function sendMessage(conversationId: string, rawText: string): Promise<ApiResult<MessageRow>> {
  const validId = assertConversationId(conversationId);
  if (!validId.ok) return validId;
  const parsed = parseWith(messageSchema, { content: rawText });
  if (!parsed.ok) return parsed;
  const user = await currentUserId();
  if (!user.ok) return user;
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.data, content_text: parsed.data.content })
    .select()
    .single();
  if (error !== null || data === null) {
    // Machine-map on code first (P0002 lock vs P0001 rate); message prefix is
    // the fallback, never a bare substring.
    if (error?.code === 'P0002' || /^locked:/i.test(error?.message ?? '')) {
      return err('chat/locked', 'Conversation verrouillée.', toAppError(error));
    }
    if (error?.code === 'P0001' || /^rate_limited:/i.test(error?.message ?? '')) {
      return err('chat/rate-limited', 'Ralentissez un peu, puis réessayez.', toAppError(error));
    }
    return err('chat/send-failed', 'Envoi impossible. Réessayez.', toAppError(error));
  }
  return ok(data);
}

/** Stamp others' messages read. Participant UPDATE policy covers read_at. */
export async function markRead(conversationId: string): Promise<ApiResult<void>> {
  const validId = assertConversationId(conversationId);
  if (!validId.ok) return validId;
  const user = await currentUserId();
  if (!user.ok) return user;
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.data)
    .is('read_at', null);
  if (error !== null) {
    return err('chat/read-failed', 'Lecture non enregistrée.', toAppError(error));
  }
  return ok(undefined);
}

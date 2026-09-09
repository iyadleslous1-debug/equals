import { supabase } from '@/lib/supabase';
import { getCurrentUserId as currentUserId } from '@/lib/auth';
import { err, ok, toAppError, type ApiResult } from '@/lib/result';

/** Report reasons (English). Each must satisfy the DB 3+ char CHECK. */
export const REPORT_REASONS = [
  'Spam',
  'Harassment',
  'Fake profile',
  'Inappropriate content',
  'Scam',
  'Other',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

interface DbError {
  code?: string | null;
  message?: string | null;
}

/** Double-block is idempotent success (UNIQUE pair); everything else surfaces. */
export function mapSafetyError(error: DbError | null): { code: string; message: string } {
  if (error?.code === '23505') {
    return { code: 'safety/already-blocked', message: 'Already blocked.' };
  }
  return { code: 'safety/action-failed', message: 'Something went wrong. Try again.' };
}

/**
 * Reports are insert-only by RLS (no UPDATE/DELETE policies exist) — once
 * submitted, neither the reporter nor anyone client-side can alter or
 * retract it. The UI must say so before confirm.
 */
export async function submitReport(
  reportedId: string,
  reason: string,
  description?: string,
): Promise<ApiResult<void>> {
  const user = await currentUserId();
  if (!user.ok) return user;
  if (reportedId === user.data) {
    return err('safety/self-report', "You can't report yourself.");
  }
  const { error } = await supabase.from('reports').insert({
    reporter_id: user.data,
    reported_id: reportedId,
    reason,
    description: description?.trim() === '' ? undefined : description?.trim(),
  });
  if (error !== null) {
    return err('safety/report-failed', "Couldn't send report. Try again.", toAppError(error));
  }
  return ok(undefined);
}

export async function blockUser(targetUserId: string): Promise<ApiResult<void>> {
  const user = await currentUserId();
  if (!user.ok) return user;
  if (targetUserId === user.data) {
    return err('safety/self-block', "You can't block yourself.");
  }
  const { error } = await supabase.from('blocks').insert({ blocker_id: user.data, blocked_id: targetUserId });
  if (error !== null) {
    if (error.code === '23505') return ok(undefined);
    const mapped = mapSafetyError(error);
    return err(mapped.code, mapped.message, toAppError(error));
  }
  return ok(undefined);
}

export async function unblockUser(targetUserId: string): Promise<ApiResult<void>> {
  const user = await currentUserId();
  if (!user.ok) return user;
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', user.data)
    .eq('blocked_id', targetUserId);
  if (error !== null) {
    return err('safety/unblock-failed', "Couldn't unblock. Try again.", toAppError(error));
  }
  return ok(undefined);
}

/** Whether I currently block the target (drives lock/notice UI). */
export async function isBlocked(targetUserId: string): Promise<ApiResult<boolean>> {
  const user = await currentUserId();
  if (!user.ok) return user;
  const { data, error } = await supabase
    .from('blocks')
    .select('id')
    .eq('blocker_id', user.data)
    .eq('blocked_id', targetUserId)
    .maybeSingle();
  if (error !== null) {
    return err('safety/block-check-failed', "Couldn't verify. Try again.", toAppError(error));
  }
  return ok(data !== null);
}

import { supabase } from '@/lib/supabase';
import { err, ok, toAppError, type ApiResult } from '@/lib/result';

/** Report reasons (French-simple). Each must satisfy the DB 3+ char CHECK. */
export const REPORT_REASONS = [
  'Spam',
  'Harcèlement',
  'Faux profil',
  'Contenu inapproprié',
  'Arnaque',
  'Autre',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

interface DbError {
  code?: string | null;
  message?: string | null;
}

/** Double-block is idempotent success (UNIQUE pair); everything else surfaces. */
export function mapSafetyError(error: DbError | null): { code: string; message: string } {
  if (error?.code === '23505') {
    return { code: 'safety/already-blocked', message: 'Déjà bloqué.' };
  }
  return { code: 'safety/action-failed', message: 'Action impossible. Réessayez.' };
}

async function currentUserId(): Promise<ApiResult<string>> {
  const { data, error } = await supabase.auth.getUser();
  if (error !== null || data.user === null) {
    return err('auth/not-signed-in', 'Connectez-vous pour continuer.');
  }
  return ok(data.user.id);
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
    return err('safety/self-report', 'Vous ne pouvez pas vous signaler vous-même.');
  }
  const { error } = await supabase.from('reports').insert({
    reporter_id: user.data,
    reported_id: reportedId,
    reason,
    description: description?.trim() === '' ? undefined : description?.trim(),
  });
  if (error !== null) {
    return err('safety/report-failed', 'Signalement impossible. Réessayez.', toAppError(error));
  }
  return ok(undefined);
}

export async function blockUser(targetUserId: string): Promise<ApiResult<void>> {
  const user = await currentUserId();
  if (!user.ok) return user;
  if (targetUserId === user.data) {
    return err('safety/self-block', 'Vous ne pouvez pas vous bloquer vous-même.');
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
    return err('safety/unblock-failed', 'Déblocage impossible. Réessayez.', toAppError(error));
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
    return err('safety/block-check-failed', 'Vérification impossible.', toAppError(error));
  }
  return ok(data !== null);
}

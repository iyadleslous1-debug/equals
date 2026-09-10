/**
 * Retention telemetry (MVP3): login streaks + activity heartbeat.
 *
 * Writes go through SECURITY DEFINER RPCs (clients have no write policies
 * on user_stats/users.last_active_at by design). All failures are local-
 * only noise — streaks/heartbeats must never break the app.
 */
import { supabase } from './supabase';
import { reportError } from './reporting';
import { err, ok, toAppError, type ApiResult } from './result';

export interface Streak {
  current_streak: number;
  longest_streak: number;
}

/** Claim today's login (idempotent, same-day no-op). Never throws. */
export async function recordLogin(): Promise<ApiResult<Streak>> {
  try {
    const { data, error } = await supabase.rpc('record_login');
    if (error !== null || data === null || !Array.isArray(data) || data.length === 0) {
      return err('activity/login-failed', "Couldn't update streak. Try again.", toAppError(error));
    }
    const row = data[0] as { current_streak?: unknown; longest_streak?: unknown };
    if (typeof row.current_streak !== 'number' || typeof row.longest_streak !== 'number') {
      return err('activity/login-failed', "Couldn't update streak. Try again.");
    }
    return ok({ current_streak: row.current_streak, longest_streak: row.longest_streak });
  } catch (thrown) {
    reportError(thrown, { where: 'activity/record-login' });
    return err('activity/login-failed', "Couldn't update streak. Try again.");
  }
}

/** Stamp activity (server throttles to one write per 5 minutes). Never throws. */
export async function touchActivity(): Promise<void> {
  try {
    await supabase.rpc('touch_activity');
  } catch {
    // Telemetry only — a failed heartbeat is invisible by design.
  }
}

/** My streak row, or null when never recorded. Never throws. */
export async function getMyStreak(): Promise<ApiResult<Streak | null>> {
  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select('current_streak, longest_streak')
      .maybeSingle();
    if (error !== null) {
      return err('activity/streak-failed', "Couldn't load streak. Try again.", toAppError(error));
    }
    if (data === null) return ok(null);
    const row = data as { current_streak?: unknown; longest_streak?: unknown };
    if (typeof row.current_streak !== 'number' || typeof row.longest_streak !== 'number') {
      return ok(null);
    }
    return ok({ current_streak: row.current_streak, longest_streak: row.longest_streak });
  } catch (thrown) {
    reportError(thrown, { where: 'activity/streak' });
    return err('activity/streak-failed', "Couldn't load streak. Try again.");
  }
}

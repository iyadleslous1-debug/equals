/**
 * Backend health check — "is Supabase reachable, and how slow?"
 *
 * Hits the Auth health endpoint (no credentials needed, bypasses RLS) with a
 * timeout, and reports latency via the perf markers. Used for debugging today
 * (`await checkSupabaseHealth()` in devtools) and the admin dashboard later.
 */
import { nowMs } from './clock';
import { config } from './config';
import { timed } from './perf';
import { err, ok, toAppError, type ApiResult } from './result';

export interface HealthStatus {
  reachable: boolean;
  latencyMs: number;
  checkedAt: string;
}

export async function checkSupabaseHealth(timeoutMs = 8000): Promise<ApiResult<HealthStatus>> {
  return timed('health.ping', async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = nowMs();
    try {
      const response = await fetch(`${config.supabaseUrl}/auth/v1/health`, {
        signal: controller.signal,
        headers: { apikey: config.supabaseAnonKey },
      });
      const latencyMs = Math.round((nowMs() - started) * 10) / 10;
      if (!response.ok) {
        return err('health/degraded', `Supabase answered ${response.status}.`, { status: response.status });
      }
      return ok({ reachable: true, latencyMs, checkedAt: new Date().toISOString() });
    } catch (error) {
      return err('health/unreachable', 'Supabase is unreachable. Check your connection.', toAppError(error));
    } finally {
      clearTimeout(timer);
    }
  });
}

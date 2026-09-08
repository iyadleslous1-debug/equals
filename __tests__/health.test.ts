import { checkSupabaseHealth } from '../lib/health';

// Network is stubbed — these tests assert mapping logic, not real connectivity.
const realFetch = global.fetch;

function mockFetch(impl: () => Promise<Response>): void {
  global.fetch = impl as unknown as typeof fetch;
}

afterEach(() => {
  global.fetch = realFetch;
});

describe('checkSupabaseHealth', () => {
  it('reports reachable with latency on HTTP 200', async () => {
    mockFetch(async () => new Response('OK', { status: 200 }));
    const result = await checkSupabaseHealth(1000);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.reachable).toBe(true);
      expect(result.data.latencyMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('reports degraded on non-200 answers', async () => {
    mockFetch(async () => new Response('nope', { status: 503 }));
    const result = await checkSupabaseHealth(1000);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('health/degraded');
  });

  it('reports unreachable on network failure', async () => {
    mockFetch(async () => {
      throw new Error('offline');
    });
    const result = await checkSupabaseHealth(1000);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('health/unreachable');
  });
});

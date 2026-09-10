import { getMyStreak, recordLogin, touchActivity } from '../lib/activity';

const mockRpc = jest.fn();
const mockMaybeSingle = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (table: string) => {
      if (table !== 'user_stats') throw new Error(`unexpected table ${table}`);
      return { select: () => ({ maybeSingle: (...args: unknown[]) => mockMaybeSingle(...args) }) };
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('activity api (MVP3 retention)', () => {
  it('recordLogin maps the streak row', async () => {
    mockRpc.mockResolvedValue({ data: [{ current_streak: 4, longest_streak: 9 }], error: null });
    await expect(recordLogin()).resolves.toEqual({
      ok: true,
      data: { current_streak: 4, longest_streak: 9 },
    });
    expect(mockRpc).toHaveBeenCalledWith('record_login');
  });

  it('recordLogin fails closed on rpc errors and malformed rows', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'down' } });
    const failed = await recordLogin();
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.error.code).toBe('activity/login-failed');

    mockRpc.mockResolvedValue({ data: [{ current_streak: 'lots' }], error: null });
    expect((await recordLogin()).ok).toBe(false);

    mockRpc.mockResolvedValue({ data: [], error: null });
    expect((await recordLogin()).ok).toBe(false);
  });

  it('recordLogin returns errors instead of throwing offline', async () => {
    mockRpc.mockRejectedValue(new Error('offline'));
    const result = await recordLogin();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('activity/login-failed');
  });

  it('touchActivity never throws', async () => {
    mockRpc.mockResolvedValue({ error: null });
    await expect(touchActivity()).resolves.toBeUndefined();
    mockRpc.mockRejectedValue(new Error('gone'));
    await expect(touchActivity()).resolves.toBeUndefined();
  });

  it('getMyStreak returns the row, null, or English errors', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { current_streak: 2, longest_streak: 5 }, error: null });
    await expect(getMyStreak()).resolves.toEqual({
      ok: true,
      data: { current_streak: 2, longest_streak: 5 },
    });

    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(getMyStreak()).resolves.toEqual({ ok: true, data: null });

    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'down' } });
    const failed = await getMyStreak();
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.error.code).toBe('activity/streak-failed');
  });
});

import { fetchCompatibility } from '../features/discover/api';

const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchCompatibility (MVP2 piece 2)', () => {
  it('maps rpc rows to a score map', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { user_id: 'u-2', score: 88 },
        { user_id: 'u-3', score: 41 },
      ],
      error: null,
    });
    const result = await fetchCompatibility(['u-2', 'u-3']);
    expect(mockRpc).toHaveBeenCalledWith('get_compatibility', { p_user_ids: ['u-2', 'u-3'] });
    expect(result).toEqual({
      ok: true,
      data: new Map([
        ['u-2', 88],
        ['u-3', 41],
      ]),
    });
  });

  it('skips the call and returns empty for an empty deck', async () => {
    await expect(fetchCompatibility([])).resolves.toEqual({ ok: true, data: new Map() });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('fails closed in English on rpc errors', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'down' } });
    const result = await fetchCompatibility(['u-2']);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('discover/compat-failed');
      expect(result.error.message).toMatch(/try again/i);
    }
  });

  it('fails closed on null data and drops malformed rows', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await expect(fetchCompatibility(['u-2'])).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'discover/compat-failed' }),
    });

    mockRpc.mockResolvedValue({
      data: [
        { user_id: 'u-2', score: 88 },
        { user_id: 'u-2', score: 10 },
        { user_id: 'u-3', score: null },
        { user_id: 42, score: 70 },
      ],
      error: null,
    });
    const deduped = await fetchCompatibility(['u-2', 'u-2', 'u-3']);
    expect(deduped).toEqual({ ok: true, data: new Map([['u-2', 10]]) });
  });
});

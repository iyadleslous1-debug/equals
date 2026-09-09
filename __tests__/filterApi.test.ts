import { fetchDeck, getMyFilters, saveFilters } from '../features/discover/api';

const mockGetUser = jest.fn();
const mockRpc = jest.fn();
const mockSelectEq = jest.fn();
const mockUpdateEq = jest.fn();
const mockUpdatePayload = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (table: string) => {
      if (table !== 'profiles') throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: (...args: unknown[]) => ({
            maybeSingle: (...inner: unknown[]) => mockSelectEq(...args, ...inner),
          }),
        }),
        update: (payload: unknown) => {
          mockUpdatePayload(payload);
          return { eq: (...args: unknown[]) => mockUpdateEq(...args) };
        },
      };
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null });
});

describe('deck filters api (MVP2 piece 4)', () => {
  it('fetchDeck forwards validated filters to the rpc', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await fetchDeck(20, { age_min: 25, age_max: null, wilayas: [16], sort: 'newest' });
    expect(mockRpc).toHaveBeenCalledWith('get_discovery_candidates', {
      p_limit: 20,
      p_age_min: 25,
      p_age_max: undefined,
      p_wilayas: [16],
      p_sort: 'newest',
    });
  });

  it('fetchDeck rejects invalid filters without calling', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    const result = await fetchDeck(20, { age_min: 40, age_max: 30, wilayas: null, sort: null });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('discover/filters-invalid');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('fetchDeck clamps wild limits', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await fetchDeck(999999);
    expect(mockRpc).toHaveBeenCalledWith(
      'get_discovery_candidates',
      expect.objectContaining({ p_limit: 50 }),
    );
  });

  it('fetchDeck without filters sends defaults (default deck)', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await fetchDeck();
    expect(mockRpc).toHaveBeenCalledWith('get_discovery_candidates', {
      p_limit: 20,
      p_age_min: undefined,
      p_age_max: undefined,
      p_wilayas: undefined,
      p_sort: 'default',
    });
  });

  it('getMyFilters maps the profile row, null when absent', async () => {
    mockSelectEq.mockResolvedValue({
      data: { filter_age_min: 25, filter_age_max: null, filter_wilayas: [16], filter_sort: 'compat' },
      error: null,
    });
    await expect(getMyFilters()).resolves.toEqual({
      ok: true,
      data: { age_min: 25, age_max: null, wilayas: [16], sort: 'compat' },
    });

    mockSelectEq.mockResolvedValue({ data: null, error: null });
    await expect(getMyFilters()).resolves.toEqual({
      ok: true,
      data: { age_min: null, age_max: null, wilayas: null, sort: 'default' },
    });
  });

  it('saveFilters validates before writing and maps to columns', async () => {
    mockUpdateEq.mockResolvedValue({ error: null });
    await expect(
      saveFilters({ age_min: 25, age_max: 35, wilayas: [16, 31], sort: 'compat' }),
    ).resolves.toEqual({ ok: true, data: undefined });
    expect(mockUpdateEq).toHaveBeenCalledTimes(1);

    const bad = await saveFilters({ age_min: 40, age_max: 30, wilayas: null, sort: null });
    expect(bad.ok).toBe(false);
    expect(mockUpdateEq).toHaveBeenCalledTimes(1);
  });

  it('normalizes empty wilaya arrays to null on read', async () => {
    mockSelectEq.mockResolvedValue({
      data: { filter_age_min: null, filter_age_max: null, filter_wilayas: [], filter_sort: null },
      error: null,
    });
    await expect(getMyFilters()).resolves.toEqual({
      ok: true,
      data: { age_min: null, age_max: null, wilayas: null, sort: 'default' },
    });
  });

  it('falls back to defaults on corrupt rows', async () => {
    mockSelectEq.mockResolvedValue({
      data: { filter_age_min: 99, filter_age_max: 12, filter_wilayas: [0], filter_sort: 'mystery' },
      error: null,
    });
    await expect(getMyFilters()).resolves.toEqual({
      ok: true,
      data: { age_min: null, age_max: null, wilayas: null, sort: 'default' },
    });
  });

  it('fails closed without a session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await getMyFilters()).ok).toBe(false);
    expect((await saveFilters({ age_min: null, age_max: null, wilayas: null, sort: null })).ok).toBe(false);
  });
});

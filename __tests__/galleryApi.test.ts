import { fetchGallery } from '../features/discover/api';

const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchGallery (MVP2 piece 3)', () => {
  it('maps rpc rows to ordered photos', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { url: 'a.jpg', is_card_photo: true, order_index: 0 },
        { url: 'b.jpg', is_card_photo: false, order_index: 1 },
      ],
      error: null,
    });
    const result = await fetchGallery('u-2');
    expect(mockRpc).toHaveBeenCalledWith('get_profile_gallery', { p_user_id: 'u-2' });
    expect(result).toEqual({
      ok: true,
      data: [
        { url: 'a.jpg', is_card_photo: true, order_index: 0 },
        { url: 'b.jpg', is_card_photo: false, order_index: 1 },
      ],
    });
  });

  it('returns empty without calling for a blank id', async () => {
    await expect(fetchGallery('')).resolves.toEqual({ ok: true, data: [] });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('fails closed in English and drops malformed rows', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'down' } });
    const failed = await fetchGallery('u-2');
    expect(failed.ok).toBe(false);
    if (!failed.ok) {
      expect(failed.error.code).toBe('discover/gallery-failed');
      expect(failed.error.message).toMatch(/try again/i);
    }

    mockRpc.mockResolvedValue({ data: 'garbage', error: null });
    await expect(fetchGallery('u-2')).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'discover/gallery-failed' }),
    });

    mockRpc.mockResolvedValue({
      data: [{ url: 'a.jpg', is_card_photo: true, order_index: 0 }, { url: 42 }],
      error: null,
    });
    await expect(fetchGallery('u-2')).resolves.toEqual({
      ok: true,
      data: [{ url: 'a.jpg', is_card_photo: true, order_index: 0 }],
    });
  });
});

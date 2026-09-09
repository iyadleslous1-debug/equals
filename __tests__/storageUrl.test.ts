import { resolveStorageUrl } from '../lib/storage-url';

const mockCreateSignedUrl = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: { from: () => ({ createSignedUrl: (...args: unknown[]) => mockCreateSignedUrl(...args) }) },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('resolveStorageUrl (audit S6)', () => {
  it('passes absolute https URLs through without touching storage', async () => {
    const result = await resolveStorageUrl('profile-photos', 'https://picsum.photos/300');
    expect(result).toEqual({ ok: true, data: 'https://picsum.photos/300' });
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it('signs bucket paths with the requested TTL', async () => {
    mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed/x' }, error: null });
    const result = await resolveStorageUrl('profile-photos', 'u-1/a.jpg', 600);
    expect(result).toEqual({ ok: true, data: 'https://signed/x' });
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('u-1/a.jpg', 600);
  });

  it('fails closed with a French error when signing fails', async () => {
    mockCreateSignedUrl.mockResolvedValue({ data: null, error: { message: 'nope' } });
    const result = await resolveStorageUrl('profile-photos', 'u-1/a.jpg');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('storage/url-failed');
  });

  it('fails closed when plain http or bare strings reach the signed path', async () => {
    mockCreateSignedUrl.mockResolvedValue({ data: null, error: { message: 'denied' } });
    const result = await resolveStorageUrl('profile-photos', 'http://evil.test/pixel.gif');
    expect(result.ok).toBe(false);
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('http://evil.test/pixel.gif', 3600);
  });

  it('refuses off-allowlist https hosts instead of passing them through', async () => {
    mockCreateSignedUrl.mockResolvedValue({ data: null, error: { message: 'denied' } });
    const result = await resolveStorageUrl('profile-photos', 'https://evil.test/pixel.gif');
    expect(result.ok).toBe(false);
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('https://evil.test/pixel.gif', 3600);
  });

  it('fails closed on bare non-URL strings', async () => {
    mockCreateSignedUrl.mockResolvedValue({ data: null, error: { message: 'denied' } });
    const result = await resolveStorageUrl('profile-photos', 'not-a-url');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('storage/url-failed');
  });
});

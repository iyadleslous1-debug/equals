import { getCurrentUserId, getSession, signOut } from '../lib/auth';

const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: (...args: unknown[]) => mockSignOut(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('auth facade (audit S6)', () => {
  it('signOut maps success and failure', async () => {
    mockSignOut.mockResolvedValue({ error: null });
    await expect(signOut()).resolves.toEqual({ ok: true, data: undefined });

    mockSignOut.mockResolvedValue({ error: { message: 'down' } });
    const failed = await signOut();
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.error.code).toBe('auth/signout-failed');
  });

  it('getSession returns the session or null', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u-1' } } } });
    await expect(getSession()).resolves.toEqual({ user: { id: 'u-1' } });

    mockGetSession.mockResolvedValue({ data: { session: null } });
    await expect(getSession()).resolves.toBeNull();
  });

  it('getCurrentUserId returns the id or a French not-signed-in error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u-9' } }, error: null });
    await expect(getCurrentUserId()).resolves.toEqual({ ok: true, data: 'u-9' });

    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const signedOut = await getCurrentUserId();
    expect(signedOut.ok).toBe(false);
    if (!signedOut.ok) expect(signedOut.error.code).toBe('auth/not-signed-in');

    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } });
    const errored = await getCurrentUserId();
    expect(errored.ok).toBe(false);
    if (!errored.ok) expect(errored.error.code).toBe('auth/not-signed-in');
  });
});

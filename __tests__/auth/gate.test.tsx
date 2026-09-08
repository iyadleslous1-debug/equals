import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useSessionStore } from '@/store/sessionStore';
import AuthGate from '../../app/index';

const mockReplace = jest.fn();
const mockRedirect = jest.fn();
const mockSignOut = jest.fn();
let mockPendingEmail: string | null | undefined = null;
let mockSignOutError: { message: string } | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Redirect: (props: { href: unknown }) => {
    mockRedirect(props.href);
    return null;
  },
}));

jest.mock('@/features/auth/hooks', () => ({
  useSignUp: () => ({}),
  useLogin: () => ({}),
  useConfirmCode: () => ({}),
  useResendCode: () => ({}),
  useSignOut: () => ({ signOut: mockSignOut, status: 'idle', error: mockSignOutError }),
  usePendingEmail: () => ({ email: mockPendingEmail, error: null }),
}));

const COMPLETE_PROFILE = { display_name: 'Amine', age: 24, gender: 'male', wilaya: 16 };

jest.mock('@/features/profile/hooks', () => ({
  useMyProfile: () => mockProfileQuery,
  useUpdateProfile: () => ({}),
  useUploadPhoto: () => ({}),
  useSetCardPhoto: () => ({}),
  useDeletePhoto: () => ({}),
  usePhotoUrls: () => ({}),
}));

let mockProfileQuery: { data?: unknown; isPending: boolean } = { data: undefined, isPending: true };

beforeEach(() => {
  jest.clearAllMocks();
  mockPendingEmail = null;
  mockSignOutError = null;
  mockProfileQuery = { data: undefined, isPending: true };
  useSessionStore.setState({ session: null, status: 'loading' });
});

describe('AuthGate', () => {
  it('shows loading while the session resolves', () => {
    render(<AuthGate />);
    expect(screen.getByText('Chargement…')).toBeTruthy();
  });

  it('resumes an unconfirmed signup at the code screen', async () => {
    mockPendingEmail = 'amine@example.dz';
    useSessionStore.setState({ session: null, status: 'guest' });
    render(<AuthGate />);
    await waitFor(() => {
      expect(mockRedirect).toHaveBeenCalledWith({
        pathname: '/confirm',
        params: { email: 'amine@example.dz' },
      });
    });
  });

  it('sends fresh guests to login', async () => {
    useSessionStore.setState({ session: null, status: 'guest' });
    render(<AuthGate />);
    await waitFor(() => {
      expect(mockRedirect).toHaveBeenCalledWith('/login');
    });
  });

  it('shows the session stub with a working logout for authed users', () => {
    mockProfileQuery = {
      isPending: false,
      data: { ok: true, data: { profile: COMPLETE_PROFILE, photos: [{ id: 'p1' }] } },
    };
    useSessionStore.setState({
      session: { user: { email: 'amine@example.dz' } } as never,
      status: 'authed',
    });
    render(<AuthGate />);
    expect(screen.getByText(/amine@example.dz/)).toBeTruthy();
    fireEvent.press(screen.getByTestId('gate-logout'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('sends authed users with incomplete profiles to onboarding', async () => {
    mockProfileQuery = {
      isPending: false,
      data: { ok: true, data: { profile: COMPLETE_PROFILE, photos: [] } },
    };
    useSessionStore.setState({ session: { user: {} } as never, status: 'authed' });
    render(<AuthGate />);
    await waitFor(() => {
      expect(mockRedirect).toHaveBeenCalledWith('/(onboarding)');
    });
  });

  it('holds a skeleton while the profile loads', () => {
    mockProfileQuery = { data: undefined, isPending: true };
    useSessionStore.setState({ session: { user: {} } as never, status: 'authed' });
    render(<AuthGate />);
    expect(screen.getByText('Chargement…')).toBeTruthy();
  });

  it('shows a retryable error instead of misrouting on profile failure', () => {
    mockProfileQuery = {
      isPending: false,
      data: { ok: false, error: { code: 'profile/load-failed', message: 'Profil introuvable.' } },
    };
    useSessionStore.setState({ session: { user: {} } as never, status: 'authed' });
    render(<AuthGate />);
    expect(screen.getByTestId('gate-profile-error')).toBeTruthy();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('surfaces sign-out failures with a retry path', () => {
    mockSignOutError = { message: 'Déconnexion impossible.' };
    mockProfileQuery = {
      isPending: false,
      data: { ok: true, data: { profile: COMPLETE_PROFILE, photos: [{ id: 'p1' }] } },
    };
    useSessionStore.setState({
      session: { user: { email: 'amine@example.dz' } } as never,
      status: 'authed',
    });
    render(<AuthGate />);
    expect(screen.getByTestId('gate-logout-error')).toBeTruthy();
    fireEvent.press(screen.getByTestId('gate-logout'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});

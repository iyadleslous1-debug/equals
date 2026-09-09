import { render, screen, waitFor } from '@testing-library/react-native';
import { useSessionStore } from '@/store/sessionStore';
import AuthGate from '../../app/index';

const mockReplace = jest.fn();
const mockRedirect = jest.fn();
let mockPendingEmail: string | null | undefined = null;

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
  useSignOut: () => ({ signOut: jest.fn(), status: 'idle', error: null }),
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

let mockProfileQuery: {
  data?: unknown;
  isPending: boolean;
  isFetching?: boolean;
  isStale?: boolean;
  isError?: boolean;
  refetch?: () => void;
} = { data: undefined, isPending: true };

beforeEach(() => {
  jest.clearAllMocks();
  mockPendingEmail = null;
  mockProfileQuery = { data: undefined, isPending: true };
  useSessionStore.setState({ session: null, status: 'loading' });
});

describe('AuthGate', () => {
  it('shows loading while the session resolves', async () => {
    await render(<AuthGate />);
    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('resumes an unconfirmed signup at the code screen', async () => {
    mockPendingEmail = 'amine@example.dz';
    useSessionStore.setState({ session: null, status: 'guest' });
    await render(<AuthGate />);
    await waitFor(() => {
      expect(mockRedirect).toHaveBeenCalledWith({
        pathname: '/confirm',
        params: { email: 'amine@example.dz' },
      });
    });
  });

  it('sends fresh guests to login', async () => {
    useSessionStore.setState({ session: null, status: 'guest' });
    await render(<AuthGate />);
    await waitFor(() => {
      expect(mockRedirect).toHaveBeenCalledWith('/login');
    });
  });

  it('sends authed users with incomplete profiles to onboarding', async () => {
    mockProfileQuery = {
      isPending: false,
      data: { ok: true, data: { profile: COMPLETE_PROFILE, photos: [] } },
    };
    useSessionStore.setState({ session: { user: {} } as never, status: 'authed' });
    await render(<AuthGate />);
    await waitFor(() => {
      expect(mockRedirect).toHaveBeenCalledWith('/setup');
    });
  });

  it('sends authed users with complete profiles to discovery', async () => {
    mockProfileQuery = {
      isPending: false,
      data: { ok: true, data: { profile: COMPLETE_PROFILE, photos: [{ id: 'p1' }] } },
    };
    useSessionStore.setState({ session: { user: {} } as never, status: 'authed' });
    await render(<AuthGate />);
    await waitFor(() => {
      expect(mockRedirect).toHaveBeenCalledWith('/discover');
    });
  });

  it('holds a skeleton while the profile loads', async () => {
    mockProfileQuery = { data: undefined, isPending: true };
    useSessionStore.setState({ session: { user: {} } as never, status: 'authed' });
    await render(<AuthGate />);
    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('holds a skeleton on stale data mid-refetch instead of misrouting', async () => {
    mockProfileQuery = {
      data: { ok: true, data: { profile: null, photos: [] } },
      isPending: false,
      isFetching: true,
      isStale: true,
    };
    useSessionStore.setState({ session: { user: {} } as never, status: 'authed' });
    await render(<AuthGate />);
    expect(screen.getByText('Loading…')).toBeTruthy();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('shows a retryable error on query failure instead of misrouting', async () => {
    mockProfileQuery = { data: undefined, isPending: false, isError: true, refetch: jest.fn() };
    useSessionStore.setState({ session: { user: {} } as never, status: 'authed' });
    await render(<AuthGate />);
    expect(screen.getByTestId('gate-profile-error')).toBeTruthy();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('shows a retryable error instead of misrouting on profile failure', async () => {
    mockProfileQuery = {
      isPending: false,
      data: { ok: false, error: { code: 'profile/load-failed', message: 'Profil introuvable.' } },
    };
    useSessionStore.setState({ session: { user: {} } as never, status: 'authed' });
    await render(<AuthGate />);
    expect(screen.getByTestId('gate-profile-error')).toBeTruthy();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});

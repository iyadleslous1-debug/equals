import { fireEvent, render, screen } from '@testing-library/react-native';
import LoginScreen from '../../app/(auth)/login';

const mockReplace = jest.fn();
const mockLogIn = jest.fn();
const mockReset = jest.fn();
let mockHookState: { status: string; error: { code: string; message: string } | null } = {
  status: 'idle',
  error: null,
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));

jest.mock('@/features/auth/hooks', () => ({
  useSignUp: () => ({}),
  useLogin: () => ({ logIn: mockLogIn, reset: mockReset, ...mockHookState }),
  useConfirmCode: () => ({}),
  useResendCode: () => ({}),
  useSignOut: () => ({}),
  usePendingEmail: () => ({ email: null, error: null }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockHookState = { status: 'idle', error: null };
});

describe('LoginScreen', () => {
  it('requires a password before calling the API', () => {
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByTestId('login-email'), 'a@b.co');
    fireEvent.press(screen.getByTestId('login-submit'));
    expect(screen.getByTestId('login-password-error')).toBeTruthy();
    expect(mockLogIn).not.toHaveBeenCalled();
  });

  it('routes to the app on success', () => {
    mockHookState = { status: 'success', error: null };
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByTestId('login-email'), 'a@b.co');
    fireEvent.changeText(screen.getByTestId('login-password'), 'Seedpass123!');
    fireEvent.press(screen.getByTestId('login-submit'));
    expect(mockLogIn).toHaveBeenCalledWith('a@b.co', 'Seedpass123!');
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('offers the code screen for unconfirmed emails', () => {
    mockHookState = {
      status: 'error',
      error: { code: 'auth/email-not-confirmed', message: 'Confirmez votre email.' },
    };
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByTestId('login-email'), 'a@b.co');
    fireEvent.changeText(screen.getByTestId('login-password'), 'Seedpass123!');
    fireEvent.press(screen.getByTestId('login-submit'));
    fireEvent.press(screen.getByTestId('login-confirm-action'));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/confirm',
      params: { email: 'a@b.co' },
    });
  });

  it('clears a stale server error when the email changes', () => {
    mockHookState = {
      status: 'error',
      error: { code: 'auth/email-not-confirmed', message: 'Confirmez votre email.' },
    };
    render(<LoginScreen />);
    expect(screen.getByTestId('login-confirm-action')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('login-email'), 'other@b.co');
    expect(mockReset).toHaveBeenCalled();
  });

  it('shows throttled and generic errors as plain messages', () => {
    mockHookState = {
      status: 'error',
      error: { code: 'auth/rate-limited', message: 'Trop de tentatives.' },
    };
    const { unmount } = render(<LoginScreen />);
    expect(screen.getByTestId('login-error')).toBeTruthy();
    expect(() => screen.getByTestId('login-confirm-action')).toThrow();
    unmount();

    mockHookState = {
      status: 'error',
      error: { code: 'auth/signin-failed', message: 'Email ou mot de passe incorrect.' },
    };
    render(<LoginScreen />);
    expect(screen.getByText('Email ou mot de passe incorrect.')).toBeTruthy();
  });
});

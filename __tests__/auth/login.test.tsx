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
  it('requires a password before calling the API', async () => {
    await render(<LoginScreen />);
    await fireEvent.changeText(screen.getByTestId('login-email'), 'a@b.co');
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(screen.getByTestId('login-password-error')).toBeTruthy();
    expect(mockLogIn).not.toHaveBeenCalled();
  });

  it('routes to the app on success', async () => {
    mockHookState = { status: 'success', error: null };
    await render(<LoginScreen />);
    await fireEvent.changeText(screen.getByTestId('login-email'), 'a@b.co');
    await fireEvent.changeText(screen.getByTestId('login-password'), 'Seedpass123!');
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(mockLogIn).toHaveBeenCalledWith('a@b.co', 'Seedpass123!');
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('offers the code screen for unconfirmed emails', async () => {
    mockHookState = {
      status: 'error',
      error: { code: 'auth/email-not-confirmed', message: 'Confirmez votre email.' },
    };
    await render(<LoginScreen />);
    await fireEvent.changeText(screen.getByTestId('login-email'), 'a@b.co');
    await fireEvent.changeText(screen.getByTestId('login-password'), 'Seedpass123!');
    await fireEvent.press(screen.getByTestId('login-submit'));
    await fireEvent.press(screen.getByTestId('login-confirm-action'));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/confirm',
      params: { email: 'a@b.co' },
    });
  });

  it('clears a stale server error when the email changes', async () => {
    mockHookState = {
      status: 'error',
      error: { code: 'auth/email-not-confirmed', message: 'Confirmez votre email.' },
    };
    await render(<LoginScreen />);
    expect(screen.getByTestId('login-confirm-action')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('login-email'), 'other@b.co');
    expect(mockReset).toHaveBeenCalled();
  });

  it('shows throttled and generic errors as plain messages', async () => {
    mockHookState = {
      status: 'error',
      error: { code: 'auth/rate-limited', message: 'Trop de tentatives.' },
    };
    const { unmount } = await render(<LoginScreen />);
    expect(screen.getByTestId('login-error')).toBeTruthy();
    expect(() => screen.getByTestId('login-confirm-action')).toThrow();
    await unmount();

    mockHookState = {
      status: 'error',
      error: { code: 'auth/signin-failed', message: 'Email ou mot de passe incorrect.' },
    };
    await render(<LoginScreen />);
    expect(screen.getByText('Email ou mot de passe incorrect.')).toBeTruthy();
  });
});

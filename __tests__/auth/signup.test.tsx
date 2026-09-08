import { fireEvent, render, screen } from '@testing-library/react-native';
import { err, ok } from '@/lib/result';
import SignupScreen from '../../app/(auth)/signup';

const mockReplace = jest.fn();
const mockSignUp = jest.fn();
let mockHookState: {
  status: string;
  error: { code: string; message: string } | null;
  needsConfirmation: boolean;
} = {
  status: 'idle',
  error: null,
  needsConfirmation: false,
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));

jest.mock('@/features/auth/hooks', () => ({
  useSignUp: () => ({ signUp: mockSignUp, ...mockHookState }),
  useLogin: () => ({}),
  useConfirmCode: () => ({}),
  useResendCode: () => ({}),
  useSignOut: () => ({}),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockHookState = { status: 'idle', error: null, needsConfirmation: false };
});

describe('SignupScreen', () => {
  it('shows inline errors for empty fields on submit', () => {
    render(<SignupScreen />);
    fireEvent.press(screen.getByTestId('signup-submit'));
    expect(screen.getByTestId('signup-email-error')).toBeTruthy();
    expect(screen.getByTestId('signup-errors')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('submits valid credentials and routes to confirm on success', () => {
    mockHookState = { status: 'success', error: null, needsConfirmation: true };
    render(<SignupScreen />);
    fireEvent.changeText(screen.getByTestId('signup-email'), 'Amine@Example.DZ');
    fireEvent.changeText(screen.getByTestId('signup-password'), 'Seedpass123!');
    fireEvent.press(screen.getByTestId('signup-submit'));
    expect(mockSignUp).toHaveBeenCalledWith('amine@example.dz', 'Seedpass123!');
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/confirm',
      params: { email: 'amine@example.dz' },
    });
  });

  it('offers sign-in instead when the email is registered', () => {
    mockHookState = {
      status: 'error',
      error: { code: 'auth/email-registered', message: 'Un compte existe déjà.' },
      needsConfirmation: false,
    };
    render(<SignupScreen />);
    fireEvent.press(screen.getByTestId('signup-signin-link'));
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('shows a spinner state while signing up', () => {
    mockHookState = { status: 'pending', error: null, needsConfirmation: false };
    render(<SignupScreen />);
    expect(screen.getByTestId('signup-submit-loading')).toBeTruthy();
  });

  it('ok/err helpers stay compatible with the hook contract', () => {
    expect(ok({ needsConfirmation: true }).ok).toBe(true);
    expect(err('auth/signup-failed', 'x').ok).toBe(false);
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ConfirmScreen from '../../app/(auth)/confirm';

const mockReplace = jest.fn();
const mockConfirm = jest.fn();
const mockResend = jest.fn();
let mockConfirmState: { status: string; error: { code: string; message: string } | null } = {
  status: 'idle',
  error: null,
};
let mockResendState: {
  label: string;
  canResend: boolean;
  error: { code: string; message: string } | null;
} = {
  label: 'Renvoyer le code',
  canResend: true,
  error: null,
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ email: 'amine@example.dz' }),
  Redirect: () => null,
}));

jest.mock('@/features/auth/hooks', () => ({
  useSignUp: () => ({}),
  useLogin: () => ({}),
  useConfirmCode: () => ({ confirm: mockConfirm, ...mockConfirmState }),
  useResendCode: () => ({ resend: mockResend, ...mockResendState }),
  useSignOut: () => ({}),
  usePendingEmail: () => ({ email: null, error: null }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockConfirmState = { status: 'idle', error: null };
  mockResendState = { label: 'Renvoyer le code', canResend: true, error: null };
});

describe('ConfirmScreen', () => {
  it('shows the address and verifies a completed code', async () => {
    mockConfirmState = { status: 'success', error: null };
    render(<ConfirmScreen />);
    expect(screen.getByText(/amine@example.dz/)).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('confirm-code-input'), '123456');
    expect(mockConfirm).toHaveBeenCalledWith('amine@example.dz', '123456');
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('shows verifying state and server errors with a resend path', () => {
    mockConfirmState = {
      status: 'error',
      error: { code: 'auth/otp-invalid', message: 'Code incorrect ou expiré.' },
    };
    render(<ConfirmScreen />);
    expect(screen.getByTestId('confirm-error')).toBeTruthy();
    fireEvent.press(screen.getByTestId('confirm-resend'));
    expect(mockResend).toHaveBeenCalledWith('amine@example.dz');
  });

  it('disables resend with a countdown reason', () => {
    mockResendState = { label: 'Renvoyer dans 47 s', canResend: false, error: null };
    render(<ConfirmScreen />);
    expect(screen.getByText('Renvoyer dans 47 s')).toBeTruthy();
  });

  it('locks input and resend while verifying, and shows resend errors', () => {
    mockConfirmState = { status: 'pending', error: null };
    mockResendState = {
      label: 'Renvoyer le code',
      canResend: true,
      error: { code: 'auth/resend-throttled', message: 'Trop de tentatives.' },
    };
    render(<ConfirmScreen />);
    expect(screen.getByTestId('confirm-code-input').props.editable).toBe(false);
    expect(screen.getByTestId('confirm-resend-error')).toBeTruthy();
  });
});

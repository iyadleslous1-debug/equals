import { fireEvent, render, screen } from '@testing-library/react-native';
import DiscoverScreen from '../app/(tabs)/discover';

const mockRefetch = jest.fn();
const mockRequest = jest.fn();
const mockSkip = jest.fn();
const mockSafetyReport = jest.fn();
const mockSafetyBlock = jest.fn();
let mockDeckQuery: { data?: unknown; isPending: boolean } = { data: undefined, isPending: true };
let mockActions: { acting: boolean; error: string | null } = { acting: false, error: null };

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
  Tabs: { Screen: () => null },
}));

jest.mock('@/features/discover/hooks', () => ({
  useDeck: () => ({ ...mockDeckQuery, refetch: mockRefetch }),
  useDeckActions: () => ({
    acting: mockActions.acting,
    request: mockRequest,
    skip: mockSkip,
    error: mockActions.error,
  }),
  useCardPhotoUrls: () => ({ 'u-2': 'https://picsum.photos/300' }),
  useAct: () => ({}),
}));

jest.mock('@/features/safety/hooks', () => ({
  useSafety: () => ({
    report: mockSafetyReport,
    block: mockSafetyBlock,
    unblock: jest.fn(),
    status: 'idle',
    error: null,
    reset: jest.fn(),
  }),
}));

const PROFILE = {
  user_id: 'u-2',
  display_name: 'Yasmine Haddad',
  age: 24,
  gender: 'female',
  wilaya: 31,
  bio: 'Oranaise.',
  card_photo_url: 'https://picsum.photos/300',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockDeckQuery = { data: undefined, isPending: true };
  mockActions = { acting: false, error: null };
});

describe('DiscoverScreen', () => {
  it('shows loading, then the top card', async () => {
    const { rerender } = await render(<DiscoverScreen />);
    expect(screen.getByText('Chargement des profils…')).toBeTruthy();

    mockDeckQuery = { isPending: false, data: { ok: true, data: [PROFILE] } };
    await rerender(<DiscoverScreen />);
    expect(screen.getByText('Yasmine Haddad, 24')).toBeTruthy();
  });

  it('routes actions with the visible profile id and surfaces action errors', async () => {
    mockDeckQuery = { isPending: false, data: { ok: true, data: [PROFILE] } };
    mockActions = { acting: false, error: 'Ralentissez un peu, puis réessayez.' };
    await render(<DiscoverScreen />);
    await fireEvent.press(screen.getByTestId('discover-request'));
    expect(mockRequest).toHaveBeenCalledWith('u-2');
    expect(screen.getByTestId('discover-action-error')).toBeTruthy();
    expect(screen.getByTestId('discover-action-error').props.accessibilityRole).toBe('alert');
  });

  it('exposes the safety menu as labelled buttons', async () => {
    mockDeckQuery = { isPending: false, data: { ok: true, data: [PROFILE] } };
    await render(<DiscoverScreen />);
    await fireEvent.press(screen.getByTestId('discover-more'));
    expect(screen.getByRole('button', { name: 'Signaler Yasmine Haddad' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bloquer Yasmine Haddad' })).toBeTruthy();
  });

  it('shows a real empty state with refresh when the deck runs out', async () => {
    mockDeckQuery = { isPending: false, data: { ok: true, data: [] } };
    await render(<DiscoverScreen />);
    expect(screen.getByText('Plus de profils pour le moment')).toBeTruthy();
    await fireEvent.press(screen.getByText('Rafraîchir'));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('shows a retryable error when the deck fails', async () => {
    mockDeckQuery = { isPending: false, data: { ok: false, error: { message: 'Découverte impossible.' } } };
    await render(<DiscoverScreen />);
    expect(screen.getByText('Découverte impossible.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Réessayer'));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('opens the safety menu and blocks the visible profile', async () => {
    mockDeckQuery = { isPending: false, data: { ok: true, data: [PROFILE] } };
    mockSafetyBlock.mockResolvedValue(true);
    await render(<DiscoverScreen />);
    await fireEvent.press(screen.getByTestId('discover-more'));
    await fireEvent.press(screen.getByTestId('discover-safety-block'));
    await fireEvent.press(screen.getByTestId('discover-block-confirm'));
    expect(mockSafetyBlock).toHaveBeenCalledWith('u-2');
  });

  it('submits a report with reason from the safety menu', async () => {
    mockDeckQuery = { isPending: false, data: { ok: true, data: [PROFILE] } };
    mockSafetyReport.mockResolvedValue(true);
    await render(<DiscoverScreen />);
    await fireEvent.press(screen.getByTestId('discover-more'));
    await fireEvent.press(screen.getByTestId('discover-safety-report'));
    await fireEvent.press(screen.getByText('Spam'));
    await fireEvent.press(screen.getByTestId('discover-report-confirm'));
    expect(mockSafetyReport).toHaveBeenCalledWith('u-2', 'Spam', '');
  });
});

import { fireEvent, render, screen } from '@testing-library/react-native';
import RequestsScreen from '../app/(tabs)/requests';

const mockRefetch = jest.fn();
const mockAccept = jest.fn();
const mockDecline = jest.fn();
let mockInbox: { data?: unknown; isPending: boolean; refetch?: () => void } = {
  data: undefined,
  isPending: true,
};
let mockRespond: { acting: boolean; error: string | null } = { acting: false, error: null };

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
  Tabs: { Screen: () => null },
}));

jest.mock('@/features/requests/hooks', () => ({
  useRequests: () => ({ ...mockInbox, refetch: mockRefetch }),
  useRespond: () => ({
    acting: mockRespond.acting,
    accept: mockAccept,
    decline: mockDecline,
    error: mockRespond.error,
    notice: null,
  }),
  useInboxPhotoUrls: () => ({}),
}));

const RECEIVED = {
  id: 'r1',
  sender_id: 'u-5',
  receiver_id: 'u-6',
  status: 'pending',
  created_at: '2026-09-08T00:00:00Z',
  direction: 'received',
  counterpart: { user_id: 'u-5', display_name: 'Mehdi Kaci', age: 27, wilaya: 19, card_photo_url: null },
};
const SENT = {
  id: 'r2',
  sender_id: 'u-6',
  receiver_id: 'u-1',
  status: 'accepted',
  created_at: '2026-09-08T00:00:00Z',
  direction: 'sent',
  counterpart: { user_id: 'u-1', display_name: 'Amine Benali', age: 22, wilaya: 16, card_photo_url: null },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockInbox = { data: undefined, isPending: true };
  mockRespond = { acting: false, error: null };
});

describe('RequestsScreen', () => {
  it('shows loading, then both sections', async () => {
    const { rerender } = await render(<RequestsScreen />);
    expect(screen.getByText('Chargement des demandes…')).toBeTruthy();

    mockInbox = { isPending: false, data: { ok: true, data: [RECEIVED, SENT] } };
    await rerender(<RequestsScreen />);
    expect(screen.getByText('Reçues')).toBeTruthy();
    expect(screen.getByText('Envoyées')).toBeTruthy();
    expect(screen.getByText('Mehdi Kaci, 27')).toBeTruthy();
    expect(screen.getByText('Acceptée')).toBeTruthy();
  });

  it('routes accept with the request id and surfaces errors', async () => {
    mockInbox = { isPending: false, data: { ok: true, data: [RECEIVED] } };
    mockRespond = { acting: false, error: 'Acceptation impossible. Réessayez.' };
    await render(<RequestsScreen />);
    await fireEvent.press(screen.getByTestId('requests-r1-accept'));
    expect(mockAccept).toHaveBeenCalledWith('r1');
    expect(screen.getByTestId('requests-action-error')).toBeTruthy();
  });

  it('routes decline with the request id', async () => {
    mockInbox = { isPending: false, data: { ok: true, data: [RECEIVED] } };
    await render(<RequestsScreen />);
    await fireEvent.press(screen.getByTestId('requests-r1-decline'));
    expect(mockDecline).toHaveBeenCalledWith('r1');
  });

  it('shows empty states per section with refresh', async () => {
    mockInbox = { isPending: false, data: { ok: true, data: [] } };
    await render(<RequestsScreen />);
    expect(screen.getByText('Aucune demande reçue')).toBeTruthy();
    expect(screen.getByText('Aucune demande envoyée')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('requests-received-empty-action'));
    await fireEvent.press(screen.getByTestId('requests-sent-empty-action'));
    expect(mockRefetch).toHaveBeenCalledTimes(2);
  });

  it('shows a retryable error when the inbox fails', async () => {
    mockInbox = { isPending: false, data: { ok: false, error: { message: 'Demandes illisibles.' } } };
    await render(<RequestsScreen />);
    expect(screen.getByText('Demandes illisibles.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Réessayer'));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});

import { fireEvent, render, screen } from '@testing-library/react-native';
import ChatListScreen from '../app/(tabs)/chat';
import ThreadScreen from '../app/chat/[id]';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockRefetch = jest.fn();
const mockSend = jest.fn();
const mockMarkRead = jest.fn();
const mockLoadMore = jest.fn();
const mockSafetyReport = jest.fn();
const mockSafetyBlock = jest.fn();
let mockHasMore = false;
let mockParams: { id?: string; name?: string; peer?: string } = {};
let mockList: { data?: unknown; isPending: boolean; refetch?: () => void } = {
  data: undefined,
  isPending: true,
};
let mockThread: { data?: unknown; isPending: boolean } = { data: undefined, isPending: true };
let mockSendState: { sending: boolean; error: { code: string; message: string } | null } = {
  sending: false,
  error: null,
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: mockPush, back: mockBack }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => undefined,
  Redirect: () => null,
  Tabs: { Screen: () => null },
}));

jest.mock('@/features/chat/hooks', () => ({
  useConversations: () => ({ ...mockList, refetch: mockRefetch }),
  useMessages: () => ({ ...mockThread, refetch: mockRefetch, loadMore: mockLoadMore, hasMore: mockHasMore }),
  usePreviewAvatars: () => ({}),
  useSendMessage: () => ({
    send: mockSend,
    sending: mockSendState.sending,
    error: mockSendState.error,
  }),
  useMarkRead: (...args: unknown[]) => {
    mockMarkRead(...args);
  },
  useOutbox: () => ({
    queue: jest.fn(() => 'local-1'),
    markSent: jest.fn(),
    markFailed: jest.fn(),
    retry: jest.fn(),
    discard: jest.fn(),
    pending: () => false,
    pendingList: () => [],
    failed: () => [],
  }),
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
  useIsBlocked: () => false,
}));

const CONVOS = [
  {
    conversationId: 'c1',
    otherUserId: 'u-2',
    otherName: 'Yasmine Haddad',
    otherAge: 24,
    otherWilaya: 31,
    otherCard: null,
    lastMessage: 'Tu connais celui près de la Grande Poste ?',
    lastMessageAt: '2026-09-08T12:04:00Z',
    unread: 2,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockList = { data: undefined, isPending: true };
  mockThread = { data: undefined, isPending: true };
  mockSendState = { sending: false, error: null };
  mockHasMore = false;
});

describe('ChatListScreen', () => {
  it('shows loading, then rows that navigate to the thread', async () => {
    const { rerender } = await render(<ChatListScreen />);
    expect(screen.getByText('Chargement des conversations…')).toBeTruthy();

    mockList = { isPending: false, data: { ok: true, data: CONVOS } };
    await rerender(<ChatListScreen />);
    expect(screen.getByText('Yasmine Haddad')).toBeTruthy();
    await fireEvent.press(screen.getByText('Yasmine Haddad'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/chat/[id]',
      params: { id: 'c1', name: 'Yasmine Haddad', peer: 'u-2' },
    });
  });

  it('shows an empty state when there are no conversations', async () => {
    mockList = { isPending: false, data: { ok: true, data: [] } };
    await render(<ChatListScreen />);
    expect(screen.getByText('Aucune conversation')).toBeTruthy();
  });
});

describe('ThreadScreen', () => {
  const MSGS = [
    { id: 'm1', sender_id: 'u-2', content_text: 'Salam', read_at: null, created_at: '2026-09-08T12:00:00Z' },
  ];

  it('renders messages oldest-first with back navigation', async () => {
    mockParams = { id: 'c1' };
    mockThread = { isPending: false, data: { ok: true, data: MSGS } };
    mockSend.mockResolvedValue({ ok: true, data: MSGS[0] });
    await render(<ThreadScreen />);
    expect(screen.getByText('Salam')).toBeTruthy();
    expect(mockMarkRead).toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('thread-back'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('sends trimmed text and surfaces failures inline', async () => {
    mockParams = { id: 'c1' };
    mockThread = { isPending: false, data: { ok: true, data: [] } };
    mockSend.mockResolvedValue({ ok: true, data: MSGS[0] });
    await render(<ThreadScreen />);
    expect(screen.getByText('Aucun message')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('thread-input-field'), 'Azul  ');
    await fireEvent.press(screen.getByTestId('thread-input-send'));
    expect(mockSend).toHaveBeenCalledWith('Azul');
  });

  it('locks the thread on a locked send error', async () => {
    mockParams = { id: 'c1' };
    mockThread = { isPending: false, data: { ok: true, data: MSGS } };
    mockSend.mockResolvedValue({
      ok: false,
      error: { code: 'chat/locked', message: 'Conversation verrouillée.' },
    });
    await render(<ThreadScreen />);
    await fireEvent.changeText(screen.getByTestId('thread-input-field'), 'Hello');
    await fireEvent.press(screen.getByTestId('thread-input-send'));
    expect(screen.getByText('Conversation verrouillée.')).toBeTruthy();
  });

  it('reports and blocks the peer from the thread menu', async () => {
    mockParams = { id: 'c1', name: 'Yasmine', peer: 'u-2' };
    mockThread = { isPending: false, data: { ok: true, data: MSGS } };
    mockSafetyBlock.mockResolvedValue(true);
    await render(<ThreadScreen />);
    expect(screen.getByText('Yasmine')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('thread-more'));
    await fireEvent.press(screen.getByTestId('thread-safety-block'));
    await fireEvent.press(screen.getByTestId('thread-block-confirm'));
    expect(mockSafetyBlock).toHaveBeenCalledWith('u-2');
  });

  it('offers loading older messages when the thread has more', async () => {
    mockParams = { id: 'c1' };
    mockThread = { isPending: false, data: { ok: true, data: MSGS } };
    mockHasMore = true;
    await render(<ThreadScreen />);
    await fireEvent.press(screen.getByTestId('thread-load-more'));
    expect(mockLoadMore).toHaveBeenCalledTimes(1);
  });
});

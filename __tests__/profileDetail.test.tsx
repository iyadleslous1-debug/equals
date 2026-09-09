import { fireEvent, render, screen } from '@testing-library/react-native';
import ProfileDetailScreen from '../app/profile/[id]';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockInvalidate = jest.fn();
const mockSendRequest = jest.fn();
const mockSkipProfile = jest.fn();

let mockGallery: { data?: unknown; isPending: boolean; refetch: jest.Mock } = {
  data: undefined,
  isPending: true,
  refetch: jest.fn(),
};
let mockCompat: { data?: unknown } = { data: undefined };
let mockMySurvey: { data?: unknown } = { data: undefined };

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: mockBack }),
  useLocalSearchParams: () => ({
    user_id: 'u-2',
    name: 'Yasmine Haddad',
    age: '24',
    wilaya: '31',
    bio: 'Ocean person.',
    card_url: '',
  }),
}));

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return { ...actual, useQueryClient: () => ({ invalidateQueries: mockInvalidate }) };
});

jest.mock('@/features/discover/hooks', () => {
  const actual = jest.requireActual('@/features/discover/hooks');
  return {
    ...actual,
    useCompatibility: () => mockCompat,
    useGallery: () => mockGallery,
  };
});

jest.mock('@/features/discover/api', () => ({
  sendRequest: (...args: unknown[]) => mockSendRequest(...args),
  skipProfile: (...args: unknown[]) => mockSkipProfile(...args),
}));

jest.mock('@/features/survey/hooks', () => ({
  useSurvey: () => mockMySurvey,
}));

jest.mock('@/hooks/useSignedUrls', () => ({
  useSignedUrls: (_prefix: string, items: { url: string }[]) => ({
    urls: Object.fromEntries(items.map((item) => [item.url, `signed:${item.url}`])),
    failedIds: [],
    reload: jest.fn(),
  }),
}));

const PHOTOS = [
  { url: 'a.jpg', is_card_photo: true, order_index: 0 },
  { url: 'b.jpg', is_card_photo: false, order_index: 1 },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockGallery = { data: undefined, isPending: true, refetch: jest.fn() };
  mockCompat = { data: undefined };
  mockMySurvey = { data: undefined };
});

describe('ProfileDetailScreen (MVP2 piece 3)', () => {
  it('shows loading, then gallery + info', async () => {
    const { rerender } = await render(<ProfileDetailScreen />);
    expect(screen.getByText('Loading profile…')).toBeTruthy();

    mockGallery = { data: { ok: true, data: PHOTOS }, isPending: false, refetch: jest.fn() };
    await rerender(<ProfileDetailScreen />);
    expect(screen.getByTestId('profile-gallery')).toBeTruthy();
    expect(screen.getByText('Yasmine Haddad, 24')).toBeTruthy();
    expect(screen.getByText('Ocean person.')).toBeTruthy();
  });

  it('shows a retryable error when the gallery fails', async () => {
    const refetch = jest.fn();
    mockGallery = { data: { ok: false, error: { message: 'Down.' } }, isPending: false, refetch };
    await render(<ProfileDetailScreen />);
    expect(screen.getByText('Down.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Retry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the subtle compat badge only when scored', async () => {
    mockGallery = { data: { ok: true, data: PHOTOS }, isPending: false, refetch: jest.fn() };
    const { unmount } = await render(<ProfileDetailScreen />);
    expect(() => screen.getByTestId('profile-compat')).toThrow();

    mockCompat = { data: { ok: true, data: new Map([['u-2', 88]]) } };
    const second = await render(<ProfileDetailScreen />);
    expect(second.getByTestId('profile-compat')).toBeTruthy();
    expect(second.getByText('Great match')).toBeTruthy();
    await unmount();
    await second.unmount();
  });

  it('requests and skips with deck invalidation and back navigation', async () => {
    mockGallery = { data: { ok: true, data: PHOTOS }, isPending: false, refetch: jest.fn() };
    mockSendRequest.mockResolvedValue({ ok: true, data: undefined });
    mockSkipProfile.mockResolvedValue({ ok: true, data: undefined });
    await render(<ProfileDetailScreen />);
    await fireEvent.press(screen.getByTestId('profile-request'));
    expect(mockSendRequest).toHaveBeenCalledWith('u-2');
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['deck'] });
    expect(mockBack).toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('profile-skip'));
    expect(mockSkipProfile).toHaveBeenCalledWith('u-2');
  });

  it('surfaces action failures inline without navigating', async () => {
    mockGallery = { data: { ok: true, data: PHOTOS }, isPending: false, refetch: jest.fn() };
    mockSendRequest.mockResolvedValue({ ok: false, error: { message: 'Nope.' } });
    await render(<ProfileDetailScreen />);
    await fireEvent.press(screen.getByTestId('profile-request'));
    expect(screen.getByTestId('profile-action-error')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('hides the compat badge below 50 and the whole profile when unavailable', async () => {
    mockGallery = { data: { ok: true, data: PHOTOS }, isPending: false, refetch: jest.fn() };
    mockCompat = { data: { ok: true, data: new Map([['u-2', 30]]) } };
    const { unmount } = await render(<ProfileDetailScreen />);
    expect(() => screen.getByTestId('profile-compat')).toThrow();
    await unmount();

    mockGallery = { data: { ok: true, data: [] }, isPending: false, refetch: jest.fn() };
    await render(<ProfileDetailScreen />);
    expect(screen.getByTestId('profile-unavailable')).toBeTruthy();
    expect(() => screen.getByTestId('profile-request')).toThrow();
  });

  it('gates double-taps to a single api call', async () => {
    mockGallery = { data: { ok: true, data: PHOTOS }, isPending: false, refetch: jest.fn() };
    let release!: (value: unknown) => void;
    mockSendRequest.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    await render(<ProfileDetailScreen />);
    await fireEvent.press(screen.getByTestId('profile-request'));
    await fireEvent.press(screen.getByTestId('profile-request'));
    await release({ ok: true, data: undefined });
    expect(mockSendRequest).toHaveBeenCalledTimes(1);
  });
});

import { fireEvent, render, screen } from '@testing-library/react-native';
import DiscoverScreen from '../app/(tabs)/discover';

const mockRefetch = jest.fn();
const mockRequest = jest.fn();
const mockSkip = jest.fn();
const mockPush = jest.fn();
const mockSafetyReport = jest.fn();
const mockSafetyBlock = jest.fn();
let mockDeckQuery: { data?: unknown; isPending: boolean } = { data: undefined, isPending: true };
let mockActions: { acting: boolean; error: string | null } = { acting: false, error: null };
// Faithful `enabled` simulation: empty id list (survey incomplete) → the
// real hook stays pending with no data; non-empty → canned scores.
let mockCompatImpl: (ids: string[]) => { data?: unknown; isPending: boolean } = () => ({
  data: undefined,
  isPending: true,
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: (...args: unknown[]) => mockPush(...args), back: jest.fn() }),
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
  useCompatibility: (ids: string[]) => mockCompatImpl(ids),
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

let mockSurvey: { data?: unknown; isPending: boolean } = { data: undefined, isPending: true };

jest.mock('@/features/survey/hooks', () => ({
  useSurvey: () => mockSurvey,
  useSaveSurvey: () => ({ save: jest.fn(), reset: jest.fn(), status: 'idle', error: null, fieldErrors: {} }),
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
  mockSurvey = { data: undefined, isPending: true };
  mockCompatImpl = () => ({ data: undefined, isPending: true });
});

describe('DiscoverScreen', () => {
  it('shows loading, then the top card', async () => {
    const { rerender } = await render(<DiscoverScreen />);
    expect(screen.getByText('Loading profiles…')).toBeTruthy();

    mockDeckQuery = { isPending: false, data: { ok: true, data: [PROFILE] } };
    await rerender(<DiscoverScreen />);
    expect(screen.getByText('Yasmine Haddad, 24')).toBeTruthy();
  });

  it('routes actions with the visible profile id and surfaces action errors', async () => {
    mockDeckQuery = { isPending: false, data: { ok: true, data: [PROFILE] } };
    mockActions = { acting: false, error: 'Slow down a bit, then try again.' };
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
    expect(screen.getByRole('button', { name: 'Report Yasmine Haddad' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Block Yasmine Haddad' })).toBeTruthy();
  });

  it('shows a real empty state with refresh when the deck runs out', async () => {
    mockDeckQuery = { isPending: false, data: { ok: true, data: [] } };
    await render(<DiscoverScreen />);
    expect(screen.getByText('No more profiles for now')).toBeTruthy();
    await fireEvent.press(screen.getByText('Refresh'));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('shows a retryable error when the deck fails', async () => {
    mockDeckQuery = { isPending: false, data: { ok: false, error: { message: "Couldn't load discovery." } } };
    await render(<DiscoverScreen />);
    expect(screen.getByText("Couldn't load discovery.")).toBeTruthy();
    await fireEvent.press(screen.getByText('Retry'));
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

  it('shows the survey prompt until completed, Later dismisses for the session', async () => {
    mockDeckQuery = { isPending: false, data: { ok: true, data: [PROFILE] } };
    mockSurvey = { data: { ok: true, data: null }, isPending: false };
    await render(<DiscoverScreen />);
    expect(screen.getByTestId('discover-survey-prompt')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('discover-survey-prompt-later'));
    expect(() => screen.getByTestId('discover-survey-prompt')).toThrow();
    // Discovery itself is untouched by dismissal.
    expect(screen.getByText('Yasmine Haddad, 24')).toBeTruthy();
  });

  it('hides the survey prompt once the survey is completed', async () => {
    mockDeckQuery = { isPending: false, data: { ok: true, data: [PROFILE] } };
    mockSurvey = {
      data: { ok: true, data: { profile_id: 'p-9', answers: {}, completed_at: '2026-09-09T00:00:00Z' } },
      isPending: false,
    };
    await render(<DiscoverScreen />);
    expect(() => screen.getByTestId('discover-survey-prompt')).toThrow();
  });

  it('offers resume on a started-but-unfinished survey', async () => {
    mockDeckQuery = { isPending: false, data: { ok: true, data: [PROFILE] } };
    mockSurvey = {
      data: { ok: true, data: { profile_id: 'p-9', answers: {}, completed_at: null } },
      isPending: false,
    };
    await render(<DiscoverScreen />);
    expect(screen.getByText('Continue your survey')).toBeTruthy();
  });

  it('hides the survey prompt when the survey fetch fails', async () => {
    mockDeckQuery = { isPending: false, data: { ok: true, data: [PROFILE] } };
    mockSurvey = {
      data: { ok: false, error: { message: 'Down.' } },
      isPending: false,
    };
    await render(<DiscoverScreen />);
    expect(() => screen.getByTestId('discover-survey-prompt')).toThrow();
    expect(screen.getByText('Yasmine Haddad, 24')).toBeTruthy();
  });

  it('orders the deck by compatibility only when my survey is completed', async () => {
    const low = { ...PROFILE, user_id: 'u-low', display_name: 'Low Match' };
    const high = { ...PROFILE, user_id: 'u-high', display_name: 'High Match' };
    mockDeckQuery = { isPending: false, data: { ok: true, data: [low, high] } };
    mockSurvey = {
      data: { ok: true, data: { profile_id: 'p-9', answers: {}, completed_at: '2026-09-09T00:00:00Z' } },
      isPending: false,
    };
    mockCompatImpl = () => ({
      data: {
        ok: true,
        data: new Map([
          ['u-low', 20],
          ['u-high', 95],
        ]),
      },
      isPending: false,
    });
    await render(<DiscoverScreen />);
    expect(screen.getByText('High Match, 24')).toBeTruthy();
    expect(() => screen.getByText('Low Match, 24')).toThrow();
  });

  it('keeps default order without my survey even when scores exist', async () => {
    const low = { ...PROFILE, user_id: 'u-low', display_name: 'Low Match' };
    const high = { ...PROFILE, user_id: 'u-high', display_name: 'High Match' };
    mockDeckQuery = { isPending: false, data: { ok: true, data: [low, high] } };
    mockSurvey = { data: { ok: true, data: null }, isPending: false };
    mockCompatImpl = (ids: string[]) =>
      ids.length === 0
        ? { data: undefined, isPending: true }
        : {
            data: {
              ok: true,
              data: new Map([
                ['u-low', 20],
                ['u-high', 95],
              ]),
            },
            isPending: false,
          };
    const { unmount } = await render(<DiscoverScreen />);
    // Hook stays disabled without my survey: empty ids → no scores → server order.
    expect(screen.getByText('Low Match, 24')).toBeTruthy();
    await unmount();
  });

  it('falls back to server order when scores fail', async () => {
    const low = { ...PROFILE, user_id: 'u-low', display_name: 'Low Match' };
    const high = { ...PROFILE, user_id: 'u-high', display_name: 'High Match' };
    mockDeckQuery = { isPending: false, data: { ok: true, data: [low, high] } };
    mockSurvey = {
      data: { ok: true, data: { profile_id: 'p-9', answers: {}, completed_at: '2026-09-09T00:00:00Z' } },
      isPending: false,
    };
    mockCompatImpl = () => ({ data: { ok: false, error: { message: 'Down.' } }, isPending: false });
    await render(<DiscoverScreen />);
    expect(screen.getByText('Low Match, 24')).toBeTruthy();
  });

  it('opens the full profile with deck params on photo tap', async () => {
    mockDeckQuery = { isPending: false, data: { ok: true, data: [PROFILE] } };
    await render(<DiscoverScreen />);
    await fireEvent.press(screen.getByTestId('discover-open'));
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/profile/[id]',
        params: expect.objectContaining({ user_id: 'u-2', name: 'Yasmine Haddad' }),
      }),
    );
  });
});

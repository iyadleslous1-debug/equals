import { fireEvent, render, screen } from '@testing-library/react-native';
import SurveyScreen from '../app/survey';

const mockSave = jest.fn();
let mockSurveyQuery: { data?: unknown; isPending: boolean; refetch: jest.Mock } = {
  data: undefined,
  isPending: true,
  refetch: jest.fn(),
};
let mockSaver: { status: string; error: string | null; fieldErrors: Record<string, string> } = {
  status: 'idle',
  error: null,
  fieldErrors: {},
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/features/survey/hooks', () => ({
  useSurvey: () => mockSurveyQuery,
  useSaveSurvey: () => ({
    save: mockSave,
    reset: jest.fn(),
    status: mockSaver.status,
    error: mockSaver.error,
    fieldErrors: mockSaver.fieldErrors,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSurveyQuery = { data: undefined, isPending: true, refetch: jest.fn() };
  mockSaver = { status: 'idle', error: null, fieldErrors: {} };
});

describe('SurveyScreen (MVP2 piece 1)', () => {
  it('shows loading, then the form', async () => {
    const { rerender } = await render(<SurveyScreen />);
    expect(screen.getByText('Loading survey…')).toBeTruthy();

    mockSurveyQuery = { data: { ok: true, data: null }, isPending: false, refetch: jest.fn() };
    await rerender(<SurveyScreen />);
    expect(screen.getByText('Help us match you')).toBeTruthy();
    expect(screen.getByText('Your hobbies? Pick up to 3.')).toBeTruthy();
  });

  it('shows a retryable error when the fetch fails', async () => {
    const refetch = jest.fn();
    mockSurveyQuery = {
      data: { ok: false, error: { message: 'Nope.' } },
      isPending: false,
      refetch,
    };
    await render(<SurveyScreen />);
    expect(screen.getByText('Nope.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Retry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('submits answers and surfaces save errors', async () => {
    mockSurveyQuery = { data: { ok: true, data: null }, isPending: false, refetch: jest.fn() };
    const { rerender } = await render(<SurveyScreen />);
    await fireEvent.press(screen.getByTestId('survey-hobby-music'));
    await fireEvent.press(screen.getByTestId('survey-vibe-cafes'));
    await fireEvent.press(screen.getByTestId('survey-rhythm-3'));
    await fireEvent.press(screen.getByTestId('survey-sports-never'));
    await fireEvent.press(screen.getByTestId('survey-cooking-sometimes'));
    await fireEvent.press(screen.getByTestId('survey-travel-nice'));
    await fireEvent.press(screen.getByTestId('survey-family-4'));
    await fireEvent.press(screen.getByTestId('survey-career-2'));
    await fireEvent.press(screen.getByTestId('survey-kids-no'));
    await fireEvent.press(screen.getByTestId('survey-smoking-no'));
    await fireEvent.press(screen.getByTestId('survey-save'));
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ vibe: 'cafes', rhythm: 3, kids: 'no' }));

    mockSaver = { status: 'error', error: 'Down.', fieldErrors: {} };
    await rerender(<SurveyScreen />);
    expect(screen.getByTestId('survey-save-error')).toBeTruthy();
  });

  it('prefills answers from an existing row (retake path)', async () => {
    mockSurveyQuery = {
      data: {
        ok: true,
        data: {
          profile_id: 'p-1',
          answers: {
            hobbies: ['music'],
            vibe: 'cafes',
            rhythm: 3,
            sports: 'never',
            cooking: 'sometimes',
            travel: 'nice',
            family: 4,
            career: 2,
            kids: 'no',
            smoking: 'no',
          },
          completed_at: '2026-09-09T00:00:00Z',
        },
      },
      isPending: false,
      refetch: jest.fn(),
    };
    await render(<SurveyScreen />);
    expect(screen.getByTestId('survey-save')).toBeTruthy();
    expect(screen.getByTestId('survey-hobby-music').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.getByTestId('survey-hobby-sports').props.accessibilityState).toEqual({
      selected: false,
    });
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import OnboardingScreen from '../app/(onboarding)/index';

const mockReplace = jest.fn();
const mockMutate = jest.fn();
const mockSaveDraft = jest.fn();
const mockClearDraft = jest.fn();
let mockProfileData: { profile: unknown; photos: unknown[] } = { profile: null, photos: [] };
let mockDraft: { step: number; fields: Record<string, unknown> } | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));

jest.mock('@/features/profile/hooks', () => ({
  useMyProfile: () => ({
    data: { ok: true, data: mockProfileData },
    isPending: false,
    refetch: jest.fn(),
  }),
  useUpdateProfile: () => ({ mutate: mockMutate, status: 'idle', data: undefined }),
  useUploadPhoto: () => ({ mutate: jest.fn(), status: 'idle' }),
  useSetCardPhoto: () => ({ mutate: jest.fn() }),
  useDeletePhoto: () => ({ mutate: jest.fn() }),
  usePhotoUrls: () => ({ urls: {}, failedIds: [], reload: jest.fn() }),
}));

jest.mock('@/features/profile/draft', () => ({
  getDraft: () => Promise.resolve(mockDraft),
  saveDraft: (...args: unknown[]) => {
    mockSaveDraft(...args);
    return Promise.resolve();
  },
  clearDraft: () => {
    mockClearDraft();
    return Promise.resolve();
  },
}));

jest.mock('@/features/profile/pickPhoto', () => ({
  pickSinglePhoto: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockProfileData = { profile: null, photos: [] };
  mockDraft = null;
  mockMutate.mockImplementation((_values: unknown, opts?: { onSuccess?: (r: unknown) => void }) => {
    opts?.onSuccess?.({ ok: true, data: {} });
  });
});

async function fillIdentity() {
  fireEvent.changeText(screen.getByTestId('onboarding-identity-name'), 'Amine Benali');
  fireEvent.changeText(screen.getByTestId('onboarding-identity-age'), '24');
  fireEvent.press(screen.getByTestId('onboarding-identity-gender-male'));
  fireEvent.press(screen.getByTestId('onboarding-identity-wilaya-open'));
  fireEvent.changeText(screen.getByTestId('onboarding-identity-wilaya-search'), 'alger');
  fireEvent.press(screen.getByText(/16 — Alger/));
}

describe('OnboardingScreen', () => {
  it('blocks invalid identity and never calls the API', async () => {
    render(<OnboardingScreen />);
    await screen.findByTestId('onboarding-identity-submit');
    fireEvent.press(screen.getByTestId('onboarding-identity-submit'));
    expect(screen.getByTestId('onboarding-identity-errors')).toBeTruthy();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('saves valid identity, persists the draft and advances to photos', async () => {
    render(<OnboardingScreen />);
    await screen.findByTestId('onboarding-identity-submit');
    await fillIdentity();
    fireEvent.press(screen.getByTestId('onboarding-identity-submit'));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: 'Amine Benali', age: 24, wilaya: 16 }),
      expect.anything(),
    );
    expect(mockSaveDraft).toHaveBeenCalledWith({ step: 1, fields: expect.anything() });
    await screen.findByTestId('onboarding-photos-grid-add');
  });

  it('resumes a half-finished wizard at the saved step', async () => {
    mockDraft = { step: 1, fields: { display_name: 'Amine' } };
    render(<OnboardingScreen />);
    await screen.findByTestId('onboarding-photos-grid-add');
    expect(screen.getByText('Étape 2/3')).toBeTruthy();
  });

  it('finishes review by clearing the draft and leaving onboarding', async () => {
    mockDraft = { step: 2, fields: { display_name: 'Amine', age: 24, gender: 'male', wilaya: 16 } };
    mockProfileData = {
      profile: { display_name: 'Amine', age: 24, gender: 'male', wilaya: 16 },
      photos: [{ id: 'p1' }],
    };
    render(<OnboardingScreen />);
    await screen.findByTestId('onboarding-review-done');
    fireEvent.press(screen.getByTestId('onboarding-review-done'));
    await waitFor(() => {
      expect(mockClearDraft).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });
});

import { act, renderHook } from '@testing-library/react-native';
import { useDeckActions } from '@/features/discover/hooks';
import { sendRequest, skipProfile } from '@/features/discover/api';

jest.mock('@/features/discover/api', () => ({
  fetchDeck: jest.fn(),
  sendRequest: jest.fn(),
  skipProfile: jest.fn(),
}));

const mockSend = sendRequest as jest.Mock;
const mockSkip = skipProfile as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useDeckActions settle', () => {
  it('advances past the card on success', async () => {
    mockSend.mockResolvedValue({ ok: true, data: undefined });
    const onDone = jest.fn();
    const { result } = await renderHook(() => useDeckActions(onDone));
    await act(async () => {
      result.current.request('u-2');
    });
    expect(onDone).toHaveBeenCalledWith('u-2');
    expect(result.current.error).toBeNull();
  });

  it('advances on idempotent already-recorded without an error', async () => {
    mockSend.mockResolvedValue({
      ok: false,
      error: { code: 'discover/already-recorded', message: 'Déjà enregistré.' },
    });
    const onDone = jest.fn();
    const { result } = await renderHook(() => useDeckActions(onDone));
    await act(async () => {
      result.current.request('u-2');
    });
    expect(onDone).toHaveBeenCalledWith('u-2');
    expect(result.current.error).toBeNull();
  });

  it('keeps the card mounted with its error on real failure', async () => {
    mockSkip.mockResolvedValue({
      ok: false,
      error: { code: 'discover/rate-limited', message: 'Ralentissez.' },
    });
    const onDone = jest.fn();
    const { result } = await renderHook(() => useDeckActions(onDone));
    await act(async () => {
      result.current.skip('u-3');
    });
    expect(onDone).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Ralentissez.');
  });

  it('recovers to error state when the api throws (audit S3)', async () => {
    mockSend.mockRejectedValue(new Error('radio silence'));
    const onDone = jest.fn();
    const { result } = await renderHook(() => useDeckActions(onDone));
    await act(async () => {
      result.current.request('u-2');
    });
    expect(onDone).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Action impossible. Réessayez.');
    // Regression guard only — useAct's finally resets `acting` even on the
    // broken code; the error/onDone assertions above are the true fix guards.
    expect(result.current.acting).toBe(false);
  });
});

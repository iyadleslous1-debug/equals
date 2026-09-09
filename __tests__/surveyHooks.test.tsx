import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useSaveSurvey } from '../features/survey/hooks';

const mockSaveSurvey = jest.fn();

jest.mock('@/features/survey/api', () => ({
  getMySurvey: jest.fn(),
  saveSurvey: (...args: unknown[]) => mockSaveSurvey(...args),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

const ANSWERS = {
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
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useSaveSurvey (MVP2 piece 1)', () => {
  it('rejects invalid shapes without calling the api', async () => {
    const { result } = await renderHook(() => useSaveSurvey(), { wrapper });
    await act(async () => {
      result.current.save({ ...ANSWERS, rhythm: 9 });
    });
    expect(mockSaveSurvey).not.toHaveBeenCalled();
    expect(result.current.status).toBe('error');
    expect(result.current.fieldErrors.rhythm).toBeTruthy();
  });

  it('rejects unknown keys and missing fields without calling the api', async () => {
    const { result } = await renderHook(() => useSaveSurvey(), { wrapper });
    await act(async () => {
      result.current.save({ ...ANSWERS, q99: 'x' });
    });
    expect(mockSaveSurvey).not.toHaveBeenCalled();
    expect(result.current.status).toBe('error');

    const partial = { ...ANSWERS } as Record<string, unknown>;
    delete partial.kids;
    const { result: missing } = await renderHook(() => useSaveSurvey(), { wrapper });
    await act(async () => {
      missing.current.save(partial);
    });
    expect(mockSaveSurvey).not.toHaveBeenCalled();
    expect(missing.current.fieldErrors.kids).toBeTruthy();
  });

  it('saves valid answers and reports success', async () => {
    mockSaveSurvey.mockResolvedValue({ ok: true, data: undefined });
    const { result } = await renderHook(() => useSaveSurvey(), { wrapper });
    await act(async () => {
      result.current.save(ANSWERS);
    });
    expect(mockSaveSurvey).toHaveBeenCalledWith(ANSWERS);
    expect(result.current.status).toBe('success');
  });

  it('surfaces api failures and throw-paths in English', async () => {
    mockSaveSurvey.mockResolvedValue({ ok: false, error: { message: 'Nope.' } });
    const { result } = await renderHook(() => useSaveSurvey(), { wrapper });
    await act(async () => {
      result.current.save(ANSWERS);
    });
    expect(result.current.error).toBe('Nope.');

    mockSaveSurvey.mockRejectedValue(new Error('gone'));
    const { result: thrown } = await renderHook(() => useSaveSurvey(), { wrapper });
    await act(async () => {
      thrown.current.save(ANSWERS);
    });
    expect(thrown.current.error).toBe('Something went wrong. Try again.');
  });
});

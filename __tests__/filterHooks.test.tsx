import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useSaveFilters } from '../features/discover/hooks';

const mockSaveFilters = jest.fn();

jest.mock('@/features/discover/api', () => ({
  fetchDeck: jest.fn(),
  fetchCompatibility: jest.fn(),
  fetchGallery: jest.fn(),
  getMyFilters: jest.fn(),
  saveFilters: (...args: unknown[]) => mockSaveFilters(...args),
  sendRequest: jest.fn(),
  skipProfile: jest.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useSaveFilters (MVP2 piece 4)', () => {
  it('rejects invalid shapes without calling the api', async () => {
    const { result } = await renderHook(() => useSaveFilters(), { wrapper });
    await act(async () => {
      result.current.save({ age_min: 40, age_max: 30, wilayas: null, sort: null });
    });
    expect(mockSaveFilters).not.toHaveBeenCalled();
    expect(result.current.status).toBe('error');
    expect(result.current.fieldErrors.age_min).toBeTruthy();
  });

  it('saves valid filters and reports success', async () => {
    mockSaveFilters.mockResolvedValue({ ok: true, data: undefined });
    const { result } = await renderHook(() => useSaveFilters(), { wrapper });
    await act(async () => {
      result.current.save({ age_min: 25, age_max: null, wilayas: [16], sort: 'newest' });
    });
    expect(mockSaveFilters).toHaveBeenCalledWith({
      age_min: 25,
      age_max: null,
      wilayas: [16],
      sort: 'newest',
    });
    expect(result.current.status).toBe('success');
  });

  it('surfaces api failures and throw-paths in English', async () => {
    mockSaveFilters.mockResolvedValue({ ok: false, error: { message: 'Nope.' } });
    const { result } = await renderHook(() => useSaveFilters(), { wrapper });
    await act(async () => {
      result.current.save({ age_min: null, age_max: null, wilayas: null, sort: null });
    });
    expect(result.current.error).toBe('Nope.');

    mockSaveFilters.mockRejectedValue(new Error('gone'));
    const { result: thrown } = await renderHook(() => useSaveFilters(), { wrapper });
    await act(async () => {
      thrown.current.save({ age_min: null, age_max: null, wilayas: null, sort: null });
    });
    expect(thrown.current.error).toBe('Something went wrong. Try again.');
  });
});

import { getMySurvey, saveSurvey } from '../features/survey/api';
import type { SurveyAnswers } from '../lib/validation/schemas';

const mockGetUser = jest.fn();
const mockMaybeSingle = jest.fn();
const mockUpsert = jest.fn();
const mockCalls: { table: string; col?: string; val?: unknown }[] = [];

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (table: string) => ({
      select: () => ({
        eq: (col: string, val: unknown) => {
          mockCalls.push({ table, col, val });
          return { maybeSingle: (...args: unknown[]) => mockMaybeSingle(...args) };
        },
      }),
      upsert: (...args: unknown[]) => mockUpsert(table, ...args),
    }),
  },
}));

const ANSWERS: SurveyAnswers = {
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
  mockCalls.length = 0;
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null });
  mockMaybeSingle.mockResolvedValue({ data: { id: 'p-1' }, error: null });
});

describe('survey api (MVP2 piece 1)', () => {
  it('getMySurvey returns the row or null', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'p-1' }, error: null }).mockResolvedValueOnce({
      data: { profile_id: 'p-1', answers: ANSWERS, completed_at: '2026-09-09T00:00:00Z' },
      error: null,
    });
    await expect(getMySurvey()).resolves.toEqual({
      ok: true,
      data: { profile_id: 'p-1', answers: ANSWERS, completed_at: '2026-09-09T00:00:00Z' },
    });

    mockMaybeSingle
      .mockResolvedValueOnce({ data: { id: 'p-1' }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    await expect(getMySurvey()).resolves.toEqual({ ok: true, data: null });
    expect(mockCalls).toContainEqual({ table: 'personality_surveys', col: 'profile_id', val: 'p-1' });
  });

  it('getMySurvey fails closed to null on malformed stored answers', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'p-1' }, error: null }).mockResolvedValueOnce({
      data: { profile_id: 'p-1', answers: { vibe: 'cafes' }, completed_at: null },
      error: null,
    });
    await expect(getMySurvey()).resolves.toEqual({ ok: true, data: null });
  });

  it('getMySurvey fails closed without a session or profile', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const signedOut = await getMySurvey();
    expect(signedOut.ok).toBe(false);

    mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const noProfile = await getMySurvey();
    expect(noProfile.ok).toBe(false);
    if (!noProfile.ok) expect(noProfile.error.code).toBe('survey/no-profile');
  });

  it('saveSurvey upserts answers with completed_at', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 'p-1' }, error: null });
    mockUpsert.mockResolvedValue({ error: null });
    await expect(saveSurvey(ANSWERS)).resolves.toEqual({ ok: true, data: undefined });
    expect(mockUpsert).toHaveBeenCalledWith(
      'personality_surveys',
      expect.objectContaining({ profile_id: 'p-1', answers: ANSWERS }),
      expect.objectContaining({ onConflict: 'profile_id' }),
    );
    const row = mockUpsert.mock.calls[0][1] as Record<string, unknown>;
    expect(typeof row.completed_at).toBe('string');
  });

  it('derives profile_id from the session, never from caller input', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'p-9' }, error: null });
    mockUpsert.mockResolvedValue({ error: null });
    await saveSurvey(ANSWERS);
    expect(mockUpsert).toHaveBeenCalledWith(
      'personality_surveys',
      expect.objectContaining({ profile_id: 'p-9' }),
      expect.anything(),
    );
  });

  it('rejects malformed answers before touching the database', async () => {
    const result = await saveSurvey({ ...ANSWERS, rhythm: 9 } as unknown as typeof ANSWERS);
    expect(result.ok).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('saveSurvey surfaces database errors in English', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 'p-1' }, error: null });
    mockUpsert.mockResolvedValue({ error: { message: 'db down' } });
    const result = await saveSurvey(ANSWERS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('survey/save-failed');
      expect(result.error.message).toMatch(/try again/i);
    }
  });
});

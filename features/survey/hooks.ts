import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { reportError } from '@/lib/reporting';
import { parseWith, surveyAnswersSchema } from '@/lib/validation/schemas';
import { getMySurvey, saveSurvey } from './api';

export const SURVEY_KEY = ['survey', 'mine'] as const;

export type SaveStatus = 'idle' | 'pending' | 'success' | 'error';

/** My survey row (null = never started). */
export function useSurvey() {
  return useQuery({ queryKey: SURVEY_KEY, queryFn: () => getMySurvey(), staleTime: 60_000 });
}

/** Validate → save → refresh. Rejects invalid shapes without touching the API. */
export function useSaveSurvey(): {
  save: (input: unknown) => void;
  reset: () => void;
  status: SaveStatus;
  error: string | null;
  fieldErrors: Record<string, string>;
} {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const client = useQueryClient();

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setFieldErrors({});
  }, []);

  const save = useCallback(
    (input: unknown) => {
      setStatus('pending');
      setError(null);
      setFieldErrors({});
      const parsed = parseWith(surveyAnswersSchema, input);
      if (!parsed.ok) {
        const next: Record<string, string> = {};
        for (const issue of (parsed.error.details as { path: (string | number)[]; message: string }[]) ??
          []) {
          const key = String(issue.path[0] ?? 'form');
          if (next[key] === undefined) next[key] = issue.message;
        }
        setFieldErrors(next);
        setStatus('error');
        return;
      }
      void (async () => {
        try {
          const result = await saveSurvey(parsed.data);
          if (!result.ok) {
            setError(result.error.message);
            setStatus('error');
            return;
          }
          setStatus('success');
          void client.invalidateQueries({ queryKey: SURVEY_KEY });
        } catch (thrown) {
          reportError(thrown, { where: 'survey/save' });
          setError('Something went wrong. Try again.');
          setStatus('error');
        }
      })();
    },
    [client],
  );

  return { save, reset, status, error, fieldErrors };
}

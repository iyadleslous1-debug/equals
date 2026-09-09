import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/auth';
import { err, ok, toAppError, type ApiResult } from '@/lib/result';
import { parseWith, surveyAnswersSchema, type SurveyAnswers } from '@/lib/validation/schemas';

export interface SurveyRow {
  profile_id: string;
  answers: SurveyAnswers;
  completed_at: string | null;
}

/**
 * My profile id. Resolved here (not via features/profile) — features never
 * import each other.
 */
async function myProfileId(): Promise<ApiResult<string>> {
  const me = await getCurrentUserId();
  if (!me.ok) return me;
  const { data, error } = await supabase.from('profiles').select('id').eq('user_id', me.data).maybeSingle();
  if (error !== null || data === null) {
    return err('survey/no-profile', 'Create your profile first.', toAppError(error));
  }
  return ok(data.id);
}

/** My survey row, or null when never started. Stored answers are re-validated
 *  (legacy/partial rows fail closed to null so scoring never sees bad shapes). */
export async function getMySurvey(): Promise<ApiResult<SurveyRow | null>> {
  const profile = await myProfileId();
  if (!profile.ok) return profile;
  const { data, error } = await supabase
    .from('personality_surveys')
    .select('profile_id, answers, completed_at')
    .eq('profile_id', profile.data)
    .maybeSingle();
  if (error !== null) {
    return err('survey/load-failed', "Couldn't load survey. Try again.", toAppError(error));
  }
  if (data === null) return ok(null);
  const answers = parseWith(surveyAnswersSchema, (data as { answers: unknown }).answers);
  if (!answers.ok) return ok(null);
  return ok({
    profile_id: (data as { profile_id: string }).profile_id,
    answers: answers.data,
    completed_at: (data as { completed_at: string | null }).completed_at,
  });
}

/**
 * Insert-or-overwrite my answers (one row per profile by PK). The shape is
 * validated here as well as in the form — the API never trusts its caller,
 * and `profile_id` always derives from the session, never from input.
 */
export async function saveSurvey(answers: SurveyAnswers): Promise<ApiResult<void>> {
  const parsed = parseWith(surveyAnswersSchema, answers);
  if (!parsed.ok) return parsed;
  const profile = await myProfileId();
  if (!profile.ok) return profile;
  const { error } = await supabase.from('personality_surveys').upsert(
    {
      profile_id: profile.data,
      answers: parsed.data,
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'profile_id' },
  );
  if (error !== null) {
    return err('survey/save-failed', "Couldn't save survey. Try again.", toAppError(error));
  }
  return ok(undefined);
}

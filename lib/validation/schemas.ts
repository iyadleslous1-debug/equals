/**
 * Client-side input validation (zod) — the FIRST gate, not the only one.
 *
 * Layered defence: zod schemas here (instant UX feedback, typed errors) →
 * Postgres CHECKs (migration 0001, authoritative) → RLS (authorization).
 * DB constraints catch what the client misses; the client catches it first
 * so users get readable errors instead of `23514` codes.
 *
 * All fallible parsing goes through `parseWith`, which returns `ApiResult<T>`
 * so feature code never touches `ZodError` directly.
 */
import { z } from 'zod';
import { err, ok, type ApiResult } from '../result';

/**
 * Neutralise invisible control characters, collapse runaway newlines, trim.
 * Deliberately conservative: keeps newlines/tabs and all languages/emoji
 * (users write in whatever language they use).
 */
export function sanitizeText(input: string): string {
  const stripped = [...input]
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 32;
      if (code === 10 || code === 9) return true; // keep \n and tab
      return code >= 32 && code !== 127;
    })
    .join('');
  return stripped.replace(/\n{3,}/g, '\n\n').trim();
}

/** Mirror of `profiles` constraints (migration 0001). Keep in sync. */
export const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters.')
  .max(40, 'Name too long (40 max).');
export const ageSchema = z.coerce
  .number()
  .int('Age must be a whole number.')
  .min(18, 'You must be 18 or older.')
  .max(100, 'That age looks wrong.');
export const genderSchema = z.enum(['male', 'female']);
export const wilayaSchema = z.coerce
  .number()
  .int()
  .min(1, 'Choose your wilaya.')
  .max(58, 'Wilaya must be between 1 and 58.');
export const bioSchema = z
  .string()
  .trim()
  .max(500, 'Bio too long (500 max).')
  .transform(sanitizeText)
  .optional();

export const profileSchema = z.object({
  display_name: displayNameSchema,
  age: ageSchema,
  gender: genderSchema,
  wilaya: wilayaSchema,
  bio: bioSchema,
});
export type ProfileInput = z.infer<typeof profileSchema>;

/** Mirror of `messages.content_text` (1–1000 chars). */
export const messageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Empty message.')
    .max(1000, 'Message too long (1000 max).')
    .transform(sanitizeText)
    .refine((value) => value.length >= 1, 'Empty message.'),
});
export type MessageInput = z.infer<typeof messageSchema>;

/** Mirror of `reports` (reason 3–60, description ≤1000). */
export const reportSchema = z.object({
  reason: z.string().trim().min(3, 'Choose a reason.').max(60, 'Reason too long.'),
  description: z.string().trim().max(1000, 'Details too long (1000 max).').transform(sanitizeText).optional(),
});
export type ReportInput = z.infer<typeof reportSchema>;

/** Parse with a schema, normalising failures to `ApiResult`. */
export function parseWith<T>(schema: z.ZodType<T>, input: unknown): ApiResult<T> {
  const result = schema.safeParse(input);
  if (result.success) return ok(result.data);
  const first = result.error.issues[0];
  const message = first?.message ?? 'Invalid input.';
  return err('validation/failed', message, result.error.issues);
}

/**
 * MVP2 personality survey (10 questions, tap-only). Strict: unknown keys are
 * rejected so compatibility scoring always sees a deterministic shape.
 * Stored opaque as `personality_surveys.answers` jsonb.
 */
export const SURVEY_HOBBIES = [
  'outdoors',
  'cooking',
  'sports',
  'reading',
  'gaming',
  'music',
  'travel',
  'art',
] as const;

const scale15 = (label: string) => z.number().int(`${label} must be 1–5.`).min(1).max(5);

export const surveyAnswersSchema = z
  .object({
    hobbies: z
      .array(z.enum(SURVEY_HOBBIES))
      .min(1, 'Pick at least 1 hobby.')
      .max(3, 'Pick at most 3 hobbies.')
      .refine((picked) => new Set(picked).size === picked.length, 'Pick each hobby once.'),
    vibe: z.enum(['homebody', 'cafes', 'restaurants', 'outdoors', 'events']),
    rhythm: scale15('Rhythm'),
    sports: z.enum(['never', 'sometimes', 'regular']),
    cooking: z.enum(['love', 'sometimes', 'never']),
    travel: z.enum(['essential', 'nice', 'low']),
    family: scale15('Family'),
    career: scale15('Career'),
    kids: z.enum(['yes', 'maybe', 'no']),
    smoking: z.enum(['no', 'occasionally', 'regularly']),
  })
  .strict();
export type SurveyAnswers = z.infer<typeof surveyAnswersSchema>;

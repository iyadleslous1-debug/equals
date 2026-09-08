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
 * (DZ users write in Arabic, French, Darja, English).
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
  .min(2, 'Name needs at least 2 characters.')
  .max(40, 'Name is too long (40 max).');
export const ageSchema = z.coerce
  .number()
  .int('Age must be a whole number.')
  .min(18, 'You must be 18 or older.')
  .max(100, 'That age looks wrong.');
export const genderSchema = z.enum(['male', 'female']);
export const wilayaSchema = z.coerce
  .number()
  .int()
  .min(1, 'Pick your wilaya.')
  .max(58, 'Wilaya must be between 1 and 58.');
export const bioSchema = z
  .string()
  .trim()
  .max(500, 'Bio is too long (500 max).')
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
    .min(1, 'Message is empty.')
    .max(1000, 'Message is too long (1000 max).')
    .transform(sanitizeText)
    .refine((value) => value.length >= 1, 'Message is empty.'),
});
export type MessageInput = z.infer<typeof messageSchema>;

/** Mirror of `reports` (reason 3–60, description ≤1000). */
export const reportSchema = z.object({
  reason: z.string().trim().min(3, 'Pick a reason.').max(60, 'Reason is too long.'),
  description: z
    .string()
    .trim()
    .max(1000, 'Details are too long (1000 max).')
    .transform(sanitizeText)
    .optional(),
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

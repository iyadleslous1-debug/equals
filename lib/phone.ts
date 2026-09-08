/**
 * Algerian phone-number handling.
 *
 * Accepts local (`0555 12 34 56`, `0555123456`), international (`+213555123456`)
 * and sloppy input (`213 555 12 34 56`), always returning strict E.164
 * (`+213555123456`) for Supabase Auth. Validation uses libphonenumber-js with
 * an explicit DZ fallback so landline/mobile mistakes surface early.
 */
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { err, ok, type ApiResult } from './result';

export const DZ_COUNTRY_CODE = '+213';

/** Normalise any reasonable DZ input to E.164, or return a typed error. */
export function normalizeDzPhone(input: string): ApiResult<string> {
  const trimmed = input.trim().replace(/[\s-.()]/g, '');
  if (trimmed === '') return err('phone/empty', 'Enter your phone number.');

  const parsed = parsePhoneNumberFromString(trimmed, 'DZ');
  if (parsed === undefined || !parsed.isValid()) {
    return err('phone/invalid', 'That number looks invalid. Use an Algerian mobile like 0555 12 34 56.');
  }
  if (parsed.country !== 'DZ') {
    return err('phone/not-dz', 'Only Algerian (+213) numbers are supported for now.');
  }
  return ok(parsed.format('E.164'));
}

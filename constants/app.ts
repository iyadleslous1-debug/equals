/** App-wide constants. Time/window values mirror server-side migration comments. */
export const APP_NAME = 'DZ Connect';
export const APP_SCHEME = 'dzconnect';

/** OTP codes are 6 digits (Supabase Auth default). */
export const OTP_LENGTH = 6;

/** Mirrors `OTP_LIMITS` in `lib/otp-throttle.ts` — keep in sync. */
export const OTP_MAX_ATTEMPTS = 3;
export const OTP_WINDOW_MINUTES = 10;
export const OTP_COOLDOWN_SECONDS = 60;

/** Profile photos: client-side upload gate (bucket has no size cap of its own). */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS = 6;
export const MIN_PHOTOS = 1;
export const ALLOWED_PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** React Query freshness for discovery-style lists. */
export const LIST_STALE_TIME_MS = 60 * 1000;

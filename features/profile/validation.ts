import { ALLOWED_PHOTO_MIMES, MAX_PHOTO_BYTES, MIN_PHOTOS } from '@/constants/app';
import { err, ok, type ApiResult } from '@/lib/result';
import { profileSchema } from '@/lib/validation/schemas';

export interface PhotoFile {
  mimeType: string | undefined;
  fileSize: number | undefined;
}

/** Client-side upload gate — rejects before any byte leaves the device. */
export function validatePhotoFile(file: PhotoFile): ApiResult<void> {
  if (file.mimeType === undefined || !(ALLOWED_PHOTO_MIMES as readonly string[]).includes(file.mimeType)) {
    return err('profile/photo-type', 'Photo JPEG, PNG ou WebP uniquement.');
  }
  if (file.fileSize === undefined) {
    return err('profile/photo-size-unknown', 'Taille illisible. Essayez une autre photo.');
  }
  if (file.fileSize > MAX_PHOTO_BYTES) {
    return err('profile/photo-too-large', 'Photo trop lourde (5 Mo max).');
  }
  return ok(undefined);
}

/** Photos a reviewer refused never unlock discovery — only pending/approved count. */
export function countVisiblePhotos(photos: { moderation_status: string }[]): number {
  return photos.filter((p) => p.moderation_status !== 'rejected').length;
}

/**
 * Discovery gate: every required field valid AND at least one acceptable
 * photo. Pass `countVisiblePhotos(photos)`, never the raw row count.
 * Mirrors the server CHECKs via `profileSchema` — the gate is a suggestion
 * nowhere; screens and (later) the discovery function both call this.
 */
export function isProfileComplete(profile: unknown, photoCount: number): boolean {
  if (photoCount < MIN_PHOTOS) return false;
  return profileSchema.safeParse(profile).success;
}

import * as FileSystem from 'expo-file-system';
import { MAX_PHOTOS } from '@/constants/app';
import { supabase } from '@/lib/supabase';
import { createLogger } from '@/lib/logger';
import { getCurrentUserId as currentUserId } from '@/lib/auth';
import { err, ok, toAppError, type ApiResult } from '@/lib/result';
import type { Database } from '@/types/database';
import { parseWith, profileSchema, type ProfileInput } from '@/lib/validation/schemas';
import { validatePhotoFile } from './validation';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type PhotoRow = Database['public']['Tables']['profile_photos']['Row'];

const BUCKET = 'profile-photos';

const log = createLogger('profile/api');

/** Storage path `<userId>/<unique>.<ext>` — first segment keys storage RLS. */
export function buildPhotoPath(userId: string, mimeType: string): string {
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const unique = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  return `${userId}/${unique}.${ext}`;
}

export async function getMyProfile(): Promise<ApiResult<{ profile: ProfileRow | null; photos: PhotoRow[] }>> {
  const user = await currentUserId();
  if (!user.ok) return user;
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.data)
    .maybeSingle();
  if (error !== null) return err('profile/load-failed', 'Profil introuvable. Réessayez.', toAppError(error));
  if (profile === null) return ok({ profile: null, photos: [] });
  const { data: photos, error: photosError } = await supabase
    .from('profile_photos')
    .select('*')
    .eq('profile_id', profile.id)
    .order('order_index');
  if (photosError !== null) {
    return err('profile/photos-failed', 'Photos introuvables. Réessayez.', toAppError(photosError));
  }
  return ok({ profile, photos });
}

export async function upsertMyProfile(input: ProfileInput): Promise<ApiResult<ProfileRow>> {
  const parsed = parseWith(profileSchema, input);
  if (!parsed.ok) return parsed;
  const user = await currentUserId();
  if (!user.ok) return user;
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ user_id: user.data, ...parsed.data }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error !== null || data === null) {
    return err('profile/save-failed', 'Sauvegarde impossible. Réessayez.', toAppError(error));
  }
  return ok(data);
}

export interface PickedPhoto {
  uri: string;
  mimeType: string | undefined;
  /** Picker-reported size when available; falls back to a filesystem stat. */
  fileSize?: number;
}

/**
 * Upload-then-insert (never the reverse): a failed insert cleans up the
 * uploaded object so no orphan files linger. First photo becomes the card.
 */
export async function uploadMyPhoto(photo: PickedPhoto): Promise<ApiResult<PhotoRow>> {
  const user = await currentUserId();
  if (!user.ok) return user;
  const mine = await getMyProfile();
  if (!mine.ok) return mine;
  if (mine.data.profile === null) {
    return err('profile/missing', 'Créez votre profil avant d’ajouter des photos.');
  }
  if (mine.data.photos.length >= MAX_PHOTOS) {
    return err('profile/too-many-photos', `${MAX_PHOTOS} photos maximum.`);
  }
  const info = photo.fileSize !== undefined ? null : await FileSystem.getInfoAsync(photo.uri);
  const checked = validatePhotoFile({
    mimeType: photo.mimeType,
    fileSize: photo.fileSize ?? (info && info.exists ? info.size : undefined),
  });
  if (!checked.ok) return checked;

  const path = buildPhotoPath(user.data, photo.mimeType ?? 'image/jpeg');
  const body = await (await fetch(photo.uri)).blob();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: photo.mimeType, upsert: false });
  if (uploadError !== null) {
    return err('profile/upload-failed', 'Envoi impossible. Réessayez.', toAppError(uploadError));
  }
  const { data, error } = await supabase
    .from('profile_photos')
    .insert({
      profile_id: mine.data.profile.id,
      url: path,
      order_index: mine.data.photos.length,
      is_card_photo: mine.data.photos.length === 0,
    })
    .select()
    .single();
  if (error !== null || data === null) {
    await supabase.storage.from(BUCKET).remove([path]);
    if ((error as { code?: string } | null)?.code === '23505') {
      return err('profile/photo-conflict', 'Photo presque prête. Touchez Réessayer.');
    }
    return err('profile/photo-save-failed', 'Enregistrement impossible. Réessayez.', toAppError(error));
  }
  return ok(data);
}

/**
 * Atomic card switch via `set_card_photo()` — one statement, no zero-card
 * window. Returns failure when the photo is not yours.
 */
export async function setCardPhoto(photoId: string): Promise<ApiResult<void>> {
  const { data, error } = await supabase.rpc('set_card_photo', { p_photo_id: photoId });
  if (error !== null || data !== true) {
    return err('profile/card-failed', 'Sélection impossible. Réessayez.', toAppError(error));
  }
  return ok(undefined);
}

export async function deleteMyPhoto(photoId: string): Promise<ApiResult<void>> {
  const mine = await getMyProfile();
  if (!mine.ok) return mine;
  const target = mine.data.photos.find((p) => p.id === photoId);
  if (!target) return err('profile/photo-not-found', 'Photo introuvable.');
  // Row first (RLS-guarded): a storage failure must not strand the row, and
  // orphan files in a private bucket are bloat, never a leak.
  const { error } = await supabase.from('profile_photos').delete().eq('id', photoId);
  if (error !== null) {
    return err('profile/photo-delete-failed', 'Suppression impossible. Réessayez.', toAppError(error));
  }
  if (!target.url.startsWith('http')) {
    const { error: removeError } = await supabase.storage.from(BUCKET).remove([target.url]);
    if (removeError !== null) log.warn('Orphaned storage object after row delete.', { photoId });
  }
  // Deleting the card promotes the oldest remaining photo — a profile with
  // photos always has exactly one card.
  if (target.is_card_photo) {
    const next = mine.data.photos
      .filter((p) => p.id !== photoId)
      .sort((a, b) => a.order_index - b.order_index)[0];
    if (next) {
      await supabase.rpc('set_card_photo', { p_photo_id: next.id });
    }
  }
  return ok(undefined);
}

import * as ImagePicker from 'expo-image-picker';
import { err, ok, type ApiResult } from '@/lib/result';
import type { PickedPhoto } from './api';

/** Device photo picker — returns a URI + mime for `uploadMyPhoto`. */
export async function pickSinglePhoto(): Promise<ApiResult<PickedPhoto | null>> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return err('profile/photo-permission', 'Autorisez l’accès aux photos pour continuer.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [3, 4],
    quality: 0.8,
  });
  if (result.canceled || result.assets.length === 0) return ok(null);
  const asset = result.assets[0];
  if (!asset?.uri) return err('profile/photo-pick-failed', 'Lecture impossible. Réessayez.');
  return ok({ uri: asset.uri, mimeType: asset.mimeType, fileSize: asset.fileSize ?? undefined });
}

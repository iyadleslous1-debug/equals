import { useMutation, useQuery, useQueryClient, useQueries } from '@tanstack/react-query';
import {
  deleteMyPhoto,
  getMyProfile,
  photoDisplayUrl,
  setCardPhoto,
  uploadMyPhoto,
  upsertMyProfile,
  type PhotoRow,
  type PickedPhoto,
} from './api';
import type { ProfileInput } from '@/lib/validation/schemas';

export const PROFILE_KEY = ['profile', 'me'] as const;

export function useMyProfile(enabled = true) {
  return useQuery({ queryKey: PROFILE_KEY, queryFn: getMyProfile, staleTime: 60_000, enabled });
}

function useInvalidateProfile() {
  const client = useQueryClient();
  return () => void client.invalidateQueries({ queryKey: PROFILE_KEY });
}

export function useUpdateProfile() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (input: ProfileInput) => upsertMyProfile(input),
    onSuccess: (result) => {
      if (result.ok) void invalidate();
    },
  });
}

export function useUploadPhoto() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (photo: PickedPhoto) => uploadMyPhoto(photo),
    onSuccess: (result) => {
      if (result.ok) void invalidate();
    },
  });
}

export function useSetCardPhoto() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (photoId: string) => setCardPhoto(photoId),
    onSuccess: (result) => {
      if (result.ok) void invalidate();
    },
  });
}

export function useDeletePhoto() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (photoId: string) => deleteMyPhoto(photoId),
    onSuccess: (result) => {
      if (result.ok) void invalidate();
    },
  });
}

/** Resolve display URLs (signed for bucket paths, passthrough for legacy). */
export function usePhotoUrls(photos: PhotoRow[]): {
  urls: Record<string, string>;
  failedIds: string[];
  reload: () => void;
} {
  const client = useQueryClient();
  const results = useQueries({
    queries: photos.map((photo) => ({
      queryKey: ['photo-url', photo.id, photo.url],
      queryFn: () => photoDisplayUrl(photo.url),
      staleTime: 30 * 60_000,
    })),
  });
  const urls: Record<string, string> = {};
  const failedIds: string[] = [];
  photos.forEach((photo, index) => {
    const data = results[index]?.data;
    if (data?.ok) urls[photo.id] = data.data;
    else if (results[index]?.status === 'error' || (data && !data.ok)) failedIds.push(photo.id);
  });
  return {
    urls,
    failedIds,
    reload: () => void client.invalidateQueries({ queryKey: ['photo-url'] }),
  };
}

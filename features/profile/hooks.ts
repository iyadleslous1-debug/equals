import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteMyPhoto,
  getMyProfile,
  setCardPhoto,
  uploadMyPhoto,
  upsertMyProfile,
  type PhotoRow,
  type PickedPhoto,
} from './api';
import { useSignedUrls, type SignedUrlMap } from '@/hooks/useSignedUrls';
import { LIST_STALE_TIME_MS } from '@/constants/app';
import type { ProfileInput } from '@/lib/validation/schemas';

export const PROFILE_KEY = ['profile', 'me'] as const;

export function useMyProfile(enabled = true) {
  return useQuery({ queryKey: PROFILE_KEY, queryFn: getMyProfile, staleTime: LIST_STALE_TIME_MS, enabled });
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
export function usePhotoUrls(photos: PhotoRow[]): SignedUrlMap {
  return useSignedUrls(
    'photo-url',
    photos,
    (photo) => photo.id,
    (photo) => photo.url,
  );
}

import { countVisiblePhotos, isProfileComplete, validatePhotoFile } from '@/features/profile/validation';
import { MAX_PHOTO_BYTES } from '@/constants/app';

describe('validatePhotoFile', () => {
  it('accepts jpeg/png/webp within the size limit', () => {
    for (const mimeType of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(validatePhotoFile({ mimeType, fileSize: 1024 }).ok).toBe(true);
    }
  });

  it('rejects oversized files before any upload starts', () => {
    const result = validatePhotoFile({ mimeType: 'image/jpeg', fileSize: MAX_PHOTO_BYTES + 1 });
    expect(result.ok).toBe(false);
  });

  it('rejects non-image types', () => {
    expect(validatePhotoFile({ mimeType: 'video/mp4', fileSize: 1024 }).ok).toBe(false);
    expect(validatePhotoFile({ mimeType: 'application/pdf', fileSize: 1024 }).ok).toBe(false);
  });

  it('rejects unknown sizes rather than uploading blind', () => {
    expect(validatePhotoFile({ mimeType: 'image/jpeg', fileSize: undefined }).ok).toBe(false);
  });
});

const fullProfile = {
  display_name: 'Amine Benali',
  age: 24,
  gender: 'male' as const,
  wilaya: 16,
  bio: 'Algerois.',
};

describe('isProfileComplete', () => {
  it('requires every field plus at least one photo', () => {
    expect(isProfileComplete(fullProfile, 1)).toBe(true);
    expect(isProfileComplete(fullProfile, 0)).toBe(false);
    expect(isProfileComplete({ ...fullProfile, display_name: '  ' }, 2)).toBe(false);
    expect(isProfileComplete({ ...fullProfile, age: 17 }, 2)).toBe(false);
    expect(isProfileComplete({ ...fullProfile, wilaya: 59 }, 1)).toBe(false);
    expect(isProfileComplete({ ...fullProfile, bio: 'x'.repeat(501) }, 3)).toBe(false);
  });

  it('treats bio as optional', () => {
    const noBio = { display_name: 'Amine Benali', age: 24, gender: 'male' as const, wilaya: 16 };
    expect(isProfileComplete(noBio, 1)).toBe(true);
  });
});

describe('countVisiblePhotos', () => {
  it('excludes refused photos from the discovery gate', () => {
    const photos = [
      { moderation_status: 'approved' },
      { moderation_status: 'pending' },
      { moderation_status: 'rejected' },
    ];
    expect(countVisiblePhotos(photos)).toBe(2);
    expect(isProfileComplete(fullProfile, countVisiblePhotos([{ moderation_status: 'rejected' }]))).toBe(
      false,
    );
  });
});

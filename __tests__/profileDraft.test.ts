import { buildPhotoPath } from '@/features/profile/api';
import { clearDraft, getDraft, saveDraft } from '@/features/profile/draft';

jest.mock('expo-secure-store', () => {
  let vault = '';
  return {
    setItemAsync: jest.fn(async (_key: string, value: string) => {
      vault = value;
    }),
    getItemAsync: jest.fn(async (_key: string) => vault),
    deleteItemAsync: jest.fn(async (_key: string) => {
      vault = '';
    }),
  };
});

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(),
}));

describe('buildPhotoPath', () => {
  it('keys the first segment off the user id with a mapped extension', () => {
    expect(buildPhotoPath('uid-1', 'image/png')).toMatch(/^uid-1\/.+\.png$/);
    expect(buildPhotoPath('uid-1', 'image/webp')).toMatch(/\.webp$/);
    expect(buildPhotoPath('uid-1', 'image/jpeg')).toMatch(/\.jpg$/);
    expect(buildPhotoPath('uid-1', 'image/jpeg')).not.toBe(buildPhotoPath('uid-1', 'image/jpeg'));
  });
});

describe('onboarding draft', () => {
  it('round-trips step and fields, tolerates corruption', async () => {
    await expect(getDraft()).resolves.toBeNull();
    await saveDraft({ step: 1, fields: { display_name: 'Amine', wilaya: 16 } });
    await expect(getDraft()).resolves.toEqual({ step: 1, fields: { display_name: 'Amine', wilaya: 16 } });
    await clearDraft();
    await expect(getDraft()).resolves.toBeNull();
  });
});

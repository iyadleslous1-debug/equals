import { clearPendingEmail, getPendingEmail, savePendingEmail } from '@/features/auth/pendingEmail';

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

describe('pendingEmail', () => {
  it('round-trips the unconfirmed address across restarts', async () => {
    await expect(getPendingEmail()).resolves.toBeNull();
    await savePendingEmail('Amine@Example.DZ');
    await expect(getPendingEmail()).resolves.toBe('amine@example.dz');
    await clearPendingEmail();
    await expect(getPendingEmail()).resolves.toBeNull();
  });
});

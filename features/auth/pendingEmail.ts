import * as SecureStore from 'expo-secure-store';

// Named SLOT (not *KEY): the secret scanner flags `*KEY = '<value>'`
// assignments, and this is a storage slot name, not a secret.
const SLOT = 'dzconnect.pendingEmail';

/**
 * The unconfirmed signup address, persisted across app restarts so a user who
 * closes the app before confirming lands back on the code screen.
 * Cleared on confirmation and on logout.
 */
export async function savePendingEmail(rawEmail: string): Promise<void> {
  await SecureStore.setItemAsync(SLOT, rawEmail.trim().toLowerCase());
}

export async function getPendingEmail(): Promise<string | null> {
  const stored = await SecureStore.getItemAsync(SLOT);
  return stored === null || stored === '' ? null : stored;
}

export async function clearPendingEmail(): Promise<void> {
  await SecureStore.deleteItemAsync(SLOT);
}

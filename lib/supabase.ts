/**
 * Supabase client singleton.
 *
 * - Typed with the generated `Database` schema (`npm run gen:types` keeps it
 *   in sync with migrations — never hand-edit `types/database.ts`).
 * - Auth sessions persist in SecureStore (encrypted at rest), not AsyncStorage.
 * - `detectSessionInUrl: false` — required on native (no OAuth redirects yet).
 */
import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './config';
import type { Database } from '../types/database';

const SecureStoreAdapter = {
  getItem: (key: string): Promise<string | null> => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string): Promise<void> => SecureStore.setItemAsync(key, value),
  removeItem: (key: string): Promise<void> => SecureStore.deleteItemAsync(key),
};

export const supabase: SupabaseClient<Database> = createClient<Database>(
  config.supabaseUrl,
  config.supabaseAnonKey,
  {
    auth: {
      storage: SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

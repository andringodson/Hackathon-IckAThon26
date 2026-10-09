import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

import { chunkedStorage } from './secure-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
// The publishable (anon) key is public by design; row-level security protects the data.
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

function create(): SupabaseClient | null {
  if (!url || !key) return null;
  const client = createClient(url, key, {
    auth: {
      // Web has no SecureStore; supabase-js falls back to localStorage there.
      storage: Platform.OS === 'web' ? undefined : chunkedStorage(SecureStore),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  });
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) =>
      state === 'active' ? client.auth.startAutoRefresh() : client.auth.stopAutoRefresh(),
    );
  }
  return client;
}

/** Null when the build has no Supabase configuration: the app then runs fully on-device. */
export const supabase = create();

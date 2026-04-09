/**
 * Load before `@supabase/supabase-js` — crypto + URL for React Native.
 * @see https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
 */
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DEFAULT_URL = 'https://xdjwcfzlhiansqxmfgrv.supabase.co';
const DEFAULT_ANON =
  'sb_publishable_lD8IfCMz1BGly5CL-Ztrog_s6t9ERl2';

function isPlaceholderSupabaseUrl(url: string): boolean {
  return /your-project-ref/i.test(url);
}

function isPlaceholderAnonKey(key: string): boolean {
  return /your-supabase-anon-key|your_anon_key_here/i.test(key);
}

function resolveSupabaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  if (!raw || isPlaceholderSupabaseUrl(raw)) {
    if (__DEV__ && raw && isPlaceholderSupabaseUrl(raw)) {
      console.warn(
        '[Supabase] Ignoring placeholder EXPO_PUBLIC_SUPABASE_URL from .env — it breaks network requests. Using bundled default. Set a real https://<ref>.supabase.co URL when ready.'
      );
    }
    return DEFAULT_URL;
  }
  return raw;
}

function resolveSupabaseAnonKey(): string {
  const raw = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!raw || isPlaceholderAnonKey(raw)) {
    if (__DEV__ && raw && isPlaceholderAnonKey(raw)) {
      console.warn(
        '[Supabase] Ignoring placeholder EXPO_PUBLIC_SUPABASE_ANON_KEY — using bundled default.'
      );
    }
    return DEFAULT_ANON;
  }
  return raw;
}

const supabaseUrl = resolveSupabaseUrl();
const supabaseAnonKey = resolveSupabaseAnonKey();

if (__DEV__) {
  try {
    // eslint-disable-next-line no-new
    new URL(supabaseUrl);
  } catch {
    console.warn('[Supabase] EXPO_PUBLIC_SUPABASE_URL is not a valid URL:', supabaseUrl);
  }
}

/**
 * Supabase auth session JSON often exceeds Expo SecureStore’s ~2048 byte limit.
 * Use AsyncStorage on native (OS-level app sandbox). One-time read migrates legacy SecureStore session.
 */
const AuthStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    const fromAsync = await AsyncStorage.getItem(key);
    if (fromAsync != null) return fromAsync;
    try {
      const legacy = await SecureStore.getItemAsync(key);
      if (legacy != null) {
        await AsyncStorage.setItem(key, legacy);
        await SecureStore.deleteItemAsync(key).catch(() => {});
      }
      return legacy;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
    await SecureStore.deleteItemAsync(key).catch(() => {});
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key).catch(() => {});
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AuthStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

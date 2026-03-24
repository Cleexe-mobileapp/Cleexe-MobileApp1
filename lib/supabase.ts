import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  'https://xdjwcfzlhiansqxmfgrv.supabase.co';

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_lD8IfCMz1BGly5CL-Ztrog_s6t9ERl2';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AuthStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

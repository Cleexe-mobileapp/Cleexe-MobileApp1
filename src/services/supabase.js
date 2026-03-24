/**
 * Single Supabase client for the whole app (same storage as @/lib/supabase).
 * Keeps session in sync with Expo Router auth guards and hooks.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

export { supabase };

export async function checkOnboardingCompleted(userId) {
  if (supabase && userId) {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.user_metadata?.onboarding_completed) return true;
    } catch {
      /* ignore */
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', userId)
        .maybeSingle();
      if (!error && data?.onboarding_completed) return true;
    } catch {
      /* table may not exist yet */
    }
  }
  try {
    const key = userId ? `@cleexe_onboarding_${userId}` : '@cleexe_onboarding_completed';
    const flag = await AsyncStorage.getItem(key);
    return flag === 'true';
  } catch {
    return false;
  }
}

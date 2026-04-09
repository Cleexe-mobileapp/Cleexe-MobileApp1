import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  getPersistedTabSegment,
  type TabSegment,
} from '../lib/last-tab-storage';
import { supabase } from '../services/supabase';

type AuthSessionContextValue = {
  session: Session | null;
  onboardingCompleted: boolean;
  lastTabSegment: TabSegment;
  initializing: boolean;
  /** Re-read profile / metadata after onboarding completes */
  refreshOnboarding: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

async function computeOnboardingAndTab(session: Session | null): Promise<{
  onboardingCompleted: boolean;
  lastTabSegment: TabSegment;
}> {
  if (!session?.user?.id) {
    return { onboardingCompleted: false, lastTabSegment: 'home' };
  }

  if (session.user.user_metadata?.onboarding_completed) {
    const lastTabSegment = await getPersistedTabSegment();
    return { onboardingCompleted: true, lastTabSegment };
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', session.user.id)
      .maybeSingle();
    if (!error && profile?.onboarding_completed) {
      const lastTabSegment = await getPersistedTabSegment();
      return { onboardingCompleted: true, lastTabSegment };
    }
  } catch {
    /* ignore */
  }

  try {
    const flag = await AsyncStorage.getItem(`@cleexe_onboarding_${session.user.id}`);
    if (flag === 'true') {
      const lastTabSegment = await getPersistedTabSegment();
      return { onboardingCompleted: true, lastTabSegment };
    }
  } catch {
    /* ignore */
  }

  return { onboardingCompleted: false, lastTabSegment: 'home' };
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [lastTabSegment, setLastTabSegment] = useState<TabSegment>('home');
  const [initializing, setInitializing] = useState(true);

  const applySession = useCallback(async (next: Session | null) => {
    const { onboardingCompleted: done, lastTabSegment: tab } =
      await computeOnboardingAndTab(next);
    setOnboardingCompleted(done);
    setLastTabSegment(tab);
  }, []);

  /** Re-read session from Supabase + onboarding flags. Must call `setSession` so React state matches storage before navigating to tabs/onboarding. */
  const refreshOnboarding = useCallback(async () => {
    try {
      const {
        data: { session: s },
      } = await supabase.auth.getSession();
      setSession(s ?? null);
      await applySession(s ?? null);
    } catch (e) {
      if (__DEV__) console.warn('[Auth] refreshOnboarding failed:', e);
    }
  }, [applySession]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const {
          data: { session: initial },
          error: initError,
        } = await supabase.auth.getSession();
        if (!mounted) return;

        // Stale or revoked refresh token — clear the corrupt session
        // so the user lands on the welcome screen instead of a crash loop.
        if (initError) {
          await supabase.auth.signOut().catch(() => {});
          setSession(null);
          await applySession(null);
          return;
        }

        setSession(initial ?? null);
        await applySession(initial ?? null);
      } catch (e) {
        // RN fetch: "Network request failed" — offline, bad EXPO_PUBLIC_SUPABASE_URL, or DNS.
        if (__DEV__) {
          console.warn(
            '[Auth] getSession failed (network or config). Check .env + connection, then npx expo start -c',
            e
          );
        }
        setSession(null);
        await applySession(null);
      } finally {
        if (mounted) setInitializing(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION') return;
      try {
        setSession(nextSession ?? null);
        await applySession(nextSession ?? null);
      } catch (e) {
        if (__DEV__) console.warn('[Auth] onAuthStateChange handler failed:', e);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const value = useMemo(
    () => ({
      session,
      onboardingCompleted,
      lastTabSegment,
      initializing,
      refreshOnboarding,
    }),
    [session, onboardingCompleted, lastTabSegment, initializing, refreshOnboarding]
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error('useAuthSession must be used within AuthSessionProvider');
  }
  return ctx;
}

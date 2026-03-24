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

  const refreshOnboarding = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    await applySession(s ?? null);
  }, [applySession]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { session: initial },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(initial ?? null);
      await applySession(initial ?? null);
      setInitializing(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION') return;
      setSession(nextSession ?? null);
      await applySession(nextSession ?? null);
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

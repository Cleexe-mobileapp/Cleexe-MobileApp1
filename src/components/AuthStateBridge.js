import { useEffect } from 'react';
import { useAuthStore } from '../../lib/store';
import { supabase } from '../services/supabase';

/**
 * Keeps Zustand auth store in sync with React Navigation + Supabase session
 * (so hooks like useProfile / useFollows still work outside Expo Router).
 */
export default function AuthStateBridge({ session }) {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setLoading = useAuthStore((s) => s.setLoading);
  const reset = useAuthStore((s) => s.reset);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (session?.user?.id) {
        setSession(session);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (!cancelled) {
          if (data && !error) setProfile(data);
          else setProfile(null);
          setLoading(false);
        }
      } else {
        reset();
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, reset, setLoading, setProfile, setSession]);

  return null;
}

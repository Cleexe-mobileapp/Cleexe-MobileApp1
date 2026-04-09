import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuthSession } from '@/src/context/AuthSessionProvider';
import { supabase } from '@/src/services/supabase';

/** unknown = still fetching journey_launch_seen */
type JourneyGate = 'unknown' | 'launch' | 'done';

export default function Index() {
  const { initializing, session, onboardingCompleted, lastTabSegment } = useAuthSession();
  const [journeyGate, setJourneyGate] = useState<JourneyGate>('unknown');

  useEffect(() => {
    if (!session?.user?.id || !onboardingCompleted) {
      setJourneyGate('done');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('journey_launch_seen')
          .eq('id', session.user.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          setJourneyGate('done');
          return;
        }
        setJourneyGate(data?.journey_launch_seen !== true ? 'launch' : 'done');
      } catch {
        if (cancelled) return;
        setJourneyGate('done');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, onboardingCompleted]);

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!onboardingCompleted) {
    return <Redirect href="/(onboarding)/onboarding-questions" />;
  }

  if (journeyGate === 'unknown') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  if (journeyGate === 'launch') {
    return <Redirect href="/journey-launch" />;
  }

  return <Redirect href={`/(tabs)/${lastTabSegment}`} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050510',
  },
});

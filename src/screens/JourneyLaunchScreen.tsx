import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { setPersistedTabSegment } from '@/src/lib/last-tab-storage';
import { useAuthSession } from '@/src/context/AuthSessionProvider';
import { useJourneyStore } from '@/src/store/useJourneyStore';
import { BRAND } from '@/src/theme/brand';

export default function JourneyLaunchScreen() {
  const { refreshOnboarding } = useAuthSession();
  const markJourneyLaunchSeen = useJourneyStore((s) => s.markJourneyLaunchSeen);
  const [busy, setBusy] = useState(false);

  const onBegin = async () => {
    setBusy(true);
    try {
      await markJourneyLaunchSeen();
      await setPersistedTabSegment('growth');
      await refreshOnboarding();
      router.replace('/(tabs)/growth');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient
      colors={['#1e0a3a', '#312e81', '#6d28d9', '#8b5cf6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.line1}>Now time to change your life!</Text>
          <Text style={styles.line2}>Take action and make it happen</Text>

          <Pressable
            onPress={onBegin}
            disabled={busy}
            style={({ pressed }) => [
              styles.cta,
              pressed && styles.ctaPressed,
              busy && { opacity: 0.7 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={22} color="#fff" style={styles.sparkle} />
                <Text style={styles.ctaText}>Begin My Transformation Journey ✨</Text>
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  line1: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  line2: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    marginBottom: 44,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: BRAND.primaryAction,
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 18,
    minWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  sparkle: { marginRight: 4 },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IdentityMirrorCard } from '@/src/components/IdentityMirrorCard';
import { MythicTimeline } from '@/src/components/MythicTimeline';
import { SomaticShiftTracker } from '@/src/components/SomaticShiftTracker';
import { useAuthSession } from '@/src/context/AuthSessionProvider';
import { useJourneyStore } from '@/src/store/useJourneyStore';
import { BRAND } from '@/src/theme/brand';
import { useTheme } from '@/src/theme/ThemeContext';

export default function GrowthScreen() {
  const theme = useTheme();
  const { session, onboardingCompleted } = useAuthSession();
  const userId = session?.user?.id ?? null;

  const hydrated = useJourneyStore((s) => s.hydrated);
  const lastError = useJourneyStore((s) => s.lastError);
  const firstName = useJourneyStore((s) => s.firstName);
  const runRecalibration = useJourneyStore((s) => s.runRecalibration);
  const hydrate = useJourneyStore((s) => s.hydrate);
  const clearError = useJourneyStore((s) => s.clearError);

  const [recoBusy, setRecoBusy] = useState(false);

  useEffect(() => {
    if (userId) void hydrate(userId);
  }, [userId, hydrate]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    const part =
      h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    return `${part}, ${firstName || 'there'}. Ready to become who you described in your answers?`;
  }, [firstName]);

  const onRecalibration = async () => {
    setRecoBusy(true);
    try {
      const { summary } = await runRecalibration();
      Alert.alert('Recalibration ritual', summary);
    } catch (e) {
      Alert.alert('Recalibration', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setRecoBusy(false);
    }
  };

  const calmGrad = [BRAND.neutralBackground, BRAND.neutralSurface] as const;

  if (userId && hydrated && !onboardingCompleted) {
    return <Redirect href="/(onboarding)/onboarding-questions" />;
  }

  if (!hydrated && userId) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={BRAND.primaryAction} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <LinearGradient colors={calmGrad} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(500)}>
            <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>
              Your Transformation Journey
            </Text>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>{greeting}</Text>
          </Animated.View>

          {lastError ? (
            <Pressable
              onPress={clearError}
              style={[styles.errorBanner, { borderColor: BRAND.coral }]}
            >
              <Text style={styles.errorText}>{lastError} (tap to dismiss)</Text>
            </Pressable>
          ) : null}

          <IdentityMirrorCard />

          <View style={styles.ctaRow}>
            <Pressable
              onPress={() => router.push('/future-self')}
              style={({ pressed }) => [styles.futureBtn, pressed && { opacity: 0.9 }]}
            >
              <Ionicons name="chatbubbles" size={20} color="#fff" />
              <Text style={styles.futureBtnText}>Talk to My Future Self</Text>
              <Ionicons name="mic-outline" size={18} color="rgba(255,255,255,0.9)" />
            </Pressable>
          </View>

          <MythicTimeline />
          <SomaticShiftTracker />

          <Pressable
            onPress={onRecalibration}
            disabled={recoBusy}
            style={({ pressed }) => [
              styles.reco,
              { borderColor: theme.cardBorder },
              pressed && { opacity: 0.9 },
              recoBusy && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="refresh" size={20} color={BRAND.primaryAction} />
            <Text style={[styles.recoText, { color: theme.textPrimary }]}>
              Recalibration ritual (90-day / life reset)
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push({
                pathname: '/growth-90-day-plan',
                params: { goal: 'Your path', progress: '0' },
              })
            }
            style={styles.secondaryLink}
          >
            <Text style={[styles.secondaryLinkText, { color: theme.textMuted }]}>
              Optional: open legacy 90-day planner →
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 120 },
  screenTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 8,
  },
  greeting: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 18,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { color: BRAND.coral, fontSize: 13 },
  ctaRow: { marginBottom: 8 },
  futureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: BRAND.primaryActionDeep,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  futureBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, flex: 1, textAlign: 'center' },
  reco: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  recoText: { fontSize: 15, fontWeight: '700', flex: 1 },
  secondaryLink: { paddingVertical: 12, alignItems: 'center' },
  secondaryLinkText: { fontSize: 13 },
});

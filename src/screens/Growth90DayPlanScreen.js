import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeContext';

export default function Growth90DayPlanScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { goal, progress } = useLocalSearchParams();

  const goalTitle = typeof goal === 'string' && goal.length > 0 ? goal : 'Goal';
  const progressPct = typeof progress === 'string' ? progress : '0';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={styles.content}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.back,
            { borderColor: theme.cardBorder, backgroundColor: theme.surface },
            pressed && { opacity: 0.75 },
          ]}
        >
          <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>Back</Text>
        </Pressable>

        <Text style={[styles.title, { color: theme.textPrimary }]}>90-Day Plan</Text>
        <Text style={[styles.goal, { color: theme.textSecondary }]}>{goalTitle}</Text>

        <View style={[styles.card, { borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Current Progress</Text>
          <Text style={[styles.cardValue, { color: theme.primary }]}>{progressPct}%</Text>
          <Text style={[styles.cardHint, { color: theme.textMuted }]}>
            Weekly milestones and task linking can be added here next.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  back: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 14,
  },
  title: { fontSize: 28, fontWeight: '800' },
  goal: { marginTop: 6, marginBottom: 20, fontSize: 15 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  cardTitle: { fontSize: 13, fontWeight: '700' },
  cardValue: { marginTop: 8, fontSize: 28, fontWeight: '900' },
  cardHint: { marginTop: 10, fontSize: 13, lineHeight: 20 },
});

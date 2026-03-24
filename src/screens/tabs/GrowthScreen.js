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
import { SafeAreaView } from 'react-native-safe-area-context';

import GlassCard from '../../components/ui/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import { fetchPositivityScore } from '../../services/ai';

const INITIAL_GOALS = [
  { title: 'Read 20 pages daily', progress: 0.65, color: '#6B4EFF' },
  { title: 'Meditate 10 minutes', progress: 0.4, color: '#059669' },
  { title: 'Exercise 3x/week', progress: 0.8, color: '#D97706' },
];

const INITIAL_TASKS = [
  { title: 'Journal for 5 minutes', done: true },
  { title: 'Review weekly goals', done: false },
  { title: 'Connect with accountability partner', done: false },
  { title: 'Complete 1 learning module', done: false },
];

export default function GrowthScreen() {
  const theme = useTheme();
  const [aiInsight, setAiInsight] = useState(null);
  const [loadingAi, setLoadingAi] = useState(true);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [goals, setGoals] = useState(INITIAL_GOALS);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: theme.bg },
        scroll: { flex: 1 },
        content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
        headline: { fontSize: 24, fontWeight: '700', color: theme.textPrimary },
        subtitle: { color: theme.textSecondary, fontSize: 14, marginTop: 4, marginBottom: 20 },
        aiCardInner: {
          minHeight: 56,
          justifyContent: 'center',
        },
        aiLabel: {
          color: theme.primary,
          fontSize: 11,
          fontWeight: '700',
          marginBottom: 6,
          letterSpacing: 0.5,
        },
        aiText: {
          color: theme.textPrimary,
          fontSize: 15,
          fontWeight: '600',
          lineHeight: 22,
        },
        streakRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
        streakBoxInner: {
          flex: 1,
          padding: 14,
          alignItems: 'center',
        },
        streakNum: { fontSize: 24, fontWeight: '700', color: theme.textPrimary },
        streakLabel: {
          fontSize: 11,
          color: theme.textSecondary,
          marginTop: 4,
          fontWeight: '500',
        },
        sectionTitle: {
          fontSize: 17,
          fontWeight: '700',
          color: theme.textPrimary,
          marginBottom: 12,
        },
        goalCard: {
          backgroundColor: theme.cardBg,
          borderRadius: theme.cardRadius,
          padding: 16,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: theme.cardBorder,
          shadowColor: theme.cardShadowColor,
          shadowOffset: theme.cardShadowOffset,
          shadowOpacity: theme.cardShadowOpacity,
          shadowRadius: theme.cardShadowRadius,
          elevation: theme.cardElevation,
        },
        goalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
        goalTitle: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
        goalPct: { fontSize: 14, fontWeight: '700' },
        goalHint: { fontSize: 11, color: theme.textMuted, marginTop: 6 },
        progressTrack: {
          height: 6,
          borderRadius: 999,
          backgroundColor: theme.separator,
        },
        progressFill: { height: '100%', borderRadius: 999 },
        btnPressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
        taskHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        },
        taskCount: { fontSize: 14, fontWeight: '700', color: theme.primary },
        taskRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.separator,
        },
        taskCheck: {
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: theme.inputBorder,
          alignItems: 'center',
          justifyContent: 'center',
        },
        taskCheckDone: { backgroundColor: theme.primary, borderColor: theme.primary },
        taskCheckMark: { color: theme.textOnPrimary, fontSize: 12, fontWeight: '700' },
        taskText: {
          fontSize: 14,
          color: theme.textPrimary,
          fontWeight: '500',
          flex: 1,
        },
        taskTextDone: { textDecorationLine: 'line-through', color: theme.textMuted },
        bottomSpacer: { height: 20 },
      }),
    [theme]
  );

  useEffect(() => {
    let mounted = true;
    fetchPositivityScore()
      .then((result) => { if (mounted) setAiInsight(result); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoadingAi(false); });
    return () => { mounted = false; };
  }, []);

  const toggleTask = (idx) => {
    setTasks((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, done: !t.done } : t))
    );
  };

  const completedCount = tasks.filter((t) => t.done).length;

  const bumpGoal = (idx) => {
    setGoals((prev) =>
      prev.map((g, i) => {
        if (i !== idx) return g;
        const next = Math.min(g.progress + 0.1, 1);
        if (next >= 1) Alert.alert('Goal Complete! 🎉', `"${g.title}" is done. Amazing work!`);
        return { ...g, progress: parseFloat(next.toFixed(2)) };
      })
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headline}>Your Growth Journey</Text>
        <Text style={styles.subtitle}>Track your progress and stay consistent</Text>

        <GlassCard style={styles.aiCardInner}>
          {loadingAi ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <>
              <Text style={styles.aiLabel}>✦ AI Insight</Text>
              <Text style={styles.aiText}>
                {aiInsight?.message ?? 'Your positivity score is up 12% this month. Keep going!'}
              </Text>
            </>
          )}
        </GlassCard>

        <View style={styles.streakRow}>
          <GlassCard style={styles.streakBoxInner}>
            <Text style={styles.streakNum}>47</Text>
            <Text style={styles.streakLabel}>Day Streak 🔥</Text>
          </GlassCard>
          <GlassCard style={styles.streakBoxInner}>
            <Text style={styles.streakNum}>89%</Text>
            <Text style={styles.streakLabel}>Consistency</Text>
          </GlassCard>
          <GlassCard style={styles.streakBoxInner}>
            <Text style={styles.streakNum}>{goals.length}</Text>
            <Text style={styles.streakLabel}>Goals Active</Text>
          </GlassCard>
        </View>

        <Text style={styles.sectionTitle}>Active Goals</Text>
        {goals.map((goal, idx) => (
          <View key={goal.title}>
            <Pressable
              style={({ pressed }) => [styles.goalCard, pressed && styles.btnPressed]}
              onPress={() => bumpGoal(idx)}
            >
              <View style={styles.goalHeader}>
                <Text style={styles.goalTitle}>{goal.title}</Text>
                <Text style={[styles.goalPct, { color: goal.color }]}>
                  {Math.round(goal.progress * 100)}%
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${goal.progress * 100}%`, backgroundColor: goal.color },
                  ]}
                />
              </View>
              <Text style={styles.goalHint}>Tap to log progress</Text>
            </Pressable>
          </View>
        ))}

        <View style={styles.taskHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Tasks</Text>
          <Text style={styles.taskCount}>{completedCount}/{tasks.length}</Text>
        </View>
        {tasks.map((task, i) => (
          <Pressable
            key={i}
            style={styles.taskRow}
            onPress={() => toggleTask(i)}
          >
            <View style={[styles.taskCheck, task.done && styles.taskCheckDone]}>
              {task.done && <Text style={styles.taskCheckMark}>✓</Text>}
            </View>
            <Text style={[styles.taskText, task.done && styles.taskTextDone]}>{task.title}</Text>
          </Pressable>
        ))}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

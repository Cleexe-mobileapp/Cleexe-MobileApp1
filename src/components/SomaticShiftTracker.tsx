import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useJourneyStore } from '@/src/store/useJourneyStore';
import { BRAND } from '@/src/theme/brand';
import { useTheme } from '@/src/theme/ThemeContext';

function Stepper({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  color: string;
}) {
  return (
    <View style={styles.stepRow}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={styles.stepControls}>
        <Pressable onPress={() => onChange(Math.max(0, value - 1))} style={styles.stepBtn}>
          <Ionicons name="remove" size={20} color={color} />
        </Pressable>
        <Text style={[styles.stepVal, { color }]}>{value}</Text>
        <Pressable onPress={() => onChange(Math.min(10, value + 1))} style={styles.stepBtn}>
          <Ionicons name="add" size={20} color={color} />
        </Pressable>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${value * 10}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function SomaticShiftTracker() {
  const theme = useTheme();
  const somaticLogs = useJourneyStore((s) => s.somaticLogs);
  const logSomatic = useJourneyStore((s) => s.logSomatic);

  const [tension, setTension] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [emotion, setEmotion] = useState(5);
  const [logging, setLogging] = useState(false);

  const trend = useMemo(() => {
    const last = somaticLogs.slice(0, 7);
    if (last.length < 2) return null;
    const avgBefore =
      last.reduce((a, b) => a + b.tension + b.energy + b.emotion, 0) / (last.length * 3);
    return avgBefore;
  }, [somaticLogs]);

  const onLog = async () => {
    setLogging(true);
    try {
      await logSomatic(tension, energy, emotion);
    } finally {
      setLogging(false);
    }
  };

  return (
    <View style={[styles.wrap, { borderColor: theme.cardBorder }]}>
      <View style={styles.headRow}>
        <Ionicons name="body" size={22} color={BRAND.teal} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Somatic Shift Tracker</Text>
      </View>
      <Text style={[styles.sub, { color: theme.textSecondary }]}>
        Before / after body scan — tension, energy, emotion (0–10)
      </Text>

      <Stepper label="Tension" value={tension} onChange={setTension} color="#f97316" />
      <Stepper label="Energy" value={energy} onChange={setEnergy} color={BRAND.teal} />
      <Stepper label="Emotion (regulation)" value={emotion} onChange={setEmotion} color={BRAND.primaryAction} />

      <Pressable
        onPress={onLog}
        disabled={logging}
        style={({ pressed }) => [styles.logBtn, pressed && { opacity: 0.9 }, logging && { opacity: 0.75 }]}
      >
        {logging ? (
          <ActivityIndicator color="#0A1628" />
        ) : (
          <Text style={styles.logBtnText}>Log felt sense</Text>
        )}
      </Pressable>

      <Animated.View key={somaticLogs[0]?.id ?? 'hint'} entering={FadeIn.duration(380)}>
        {trend != null && somaticLogs.length >= 2 ? (
          <Text style={[styles.trend, { color: theme.textMuted }]}>
            Felt-shift index (recent check-ins): trending{' '}
            {somaticLogs[0].tension < somaticLogs[1].tension ? 'lighter in the body' : 'steady presence'}
          </Text>
        ) : (
          <Text style={[styles.trend, { color: theme.textMuted }]}>
            Log twice to see your “felt shift” trend.
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 4, marginBottom: 12 },
  stepRow: { marginBottom: 14 },
  stepLabel: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 6 },
  stepControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepVal: { fontSize: 18, fontWeight: '800', minWidth: 28, textAlign: 'center' },
  barBg: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginTop: 8,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 999 },
  logBtn: {
    marginTop: 8,
    backgroundColor: BRAND.teal,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  logBtnText: { color: '#0A1628', fontWeight: '800' },
  trend: { fontSize: 12, marginTop: 12, fontStyle: 'italic' },
});

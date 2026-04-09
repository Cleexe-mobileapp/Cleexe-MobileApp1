import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
} from 'expo-audio';

import { useJourneyStore } from '@/src/store/useJourneyStore';
import { BRAND } from '@/src/theme/brand';
import { useTheme } from '@/src/theme/ThemeContext';

export function IdentityMirrorCard() {
  const theme = useTheme();
  const currentMirrorQuestion = useJourneyStore((s) => s.currentMirrorQuestion);
  const lastMirrorSnapshot = useJourneyStore((s) => s.lastMirrorSnapshot);
  const mirrorLoading = useJourneyStore((s) => s.mirrorLoading);
  const submitMirrorAnswer = useJourneyStore((s) => s.submitMirrorAnswer);
  const clearLastMirrorSnapshot = useJourneyStore((s) => s.clearLastMirrorSnapshot);

  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (mirrorLoading) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.04, { duration: 900 }), withTiming(1, { duration: 900 })),
        -1,
        true
      );
    } else {
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [mirrorLoading, pulse]);

  const cardAnim = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const startRecording = useCallback(async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) return;
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecording(true);
    setVoiceUri(null);
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    await recorder.stop();
    setRecording(false);
    if (recorder.uri) setVoiceUri(recorder.uri);
  }, [recorder]);

  const onSubmit = async () => {
    if (!text.trim() && !voiceUri) return;
    await submitMirrorAnswer(text.trim() || '(voice reflection)', voiceUri);
    setText('');
    setVoiceUri(null);
  };

  const isLight = theme.tier === 'calm';

  return (
    <Animated.View entering={FadeIn.duration(420)} style={[styles.wrap, cardAnim]}>
      <View style={[styles.header, isLight && styles.headerLight]}>
        <Ionicons name="infinite" size={22} color={BRAND.primaryAction} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Identity Mirror</Text>
        <Text style={[styles.sub, { color: theme.textSecondary }]}>
          Daily truth — from your own words
        </Text>
      </View>

      {mirrorLoading && !currentMirrorQuestion ? (
        <ActivityIndicator style={styles.loader} color={BRAND.primaryAction} />
      ) : (
        <Text style={[styles.question, { color: theme.textPrimary }]}>
          {currentMirrorQuestion ?? 'Loading your mirror…'}
        </Text>
      )}

      <TextInput
        style={[
          styles.input,
          {
            color: theme.textPrimary,
            borderColor: isLight ? 'rgba(139,92,246,0.35)' : 'rgba(139,92,246,0.5)',
            backgroundColor: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.5)',
          },
        ]}
        placeholder="Write what comes up…"
        placeholderTextColor={theme.textMuted}
        multiline
        value={text}
        onChangeText={(v) => {
          if (v.length > 0) clearLastMirrorSnapshot();
          setText(v);
        }}
        textAlignVertical="top"
      />

      <View style={styles.row}>
        <Pressable
          onPress={recording ? stopRecording : startRecording}
          style={({ pressed }) => [
            styles.micBtn,
            recording && styles.micActive,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name={recording ? 'stop' : 'mic'} size={20} color="#fff" />
          <Text style={styles.micLabel}>{recording ? 'Stop' : 'Voice'}</Text>
        </Pressable>
        {voiceUri ? (
          <Text style={[styles.voiceHint, { color: BRAND.teal }]}>Voice note ready</Text>
        ) : null}
      </View>

      <Pressable
        onPress={onSubmit}
        disabled={mirrorLoading || (!text.trim() && !voiceUri)}
        style={({ pressed }) => [
          styles.submit,
          pressed && { opacity: 0.9 },
          (mirrorLoading || (!text.trim() && !voiceUri)) && { opacity: 0.45 },
        ]}
      >
        {mirrorLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="paper-plane" size={18} color="#fff" />
            <Text style={styles.submitText}>Reveal identity snapshot</Text>
          </>
        )}
      </Pressable>

      {lastMirrorSnapshot ? (
        <Animated.View entering={FadeIn.duration(520)} style={styles.snapshotBox}>
          <Text style={[styles.snapshotLabel, { color: theme.textMuted }]}>Identity snapshot</Text>
          <Text style={[styles.snapshotText, { color: theme.textPrimary }]}>{lastMirrorSnapshot}</Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    backgroundColor: 'rgba(139,92,246,0.06)',
  },
  header: { marginBottom: 12 },
  headerLight: {},
  title: { fontSize: 20, fontWeight: '800', marginTop: 6 },
  sub: { fontSize: 13, marginTop: 4 },
  loader: { marginVertical: 16 },
  question: { fontSize: 16, lineHeight: 24, fontWeight: '600', marginBottom: 14 },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  micBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRAND.primaryActionDeep,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  micActive: { backgroundColor: '#b91c1c' },
  micLabel: { color: '#fff', fontWeight: '700', fontSize: 14 },
  voiceHint: { fontSize: 13, fontWeight: '600' },
  submit: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND.primaryAction,
    paddingVertical: 14,
    borderRadius: 14,
  },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  snapshotBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.35)',
  },
  snapshotLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  snapshotText: { fontSize: 15, lineHeight: 23, fontWeight: '600' },
});

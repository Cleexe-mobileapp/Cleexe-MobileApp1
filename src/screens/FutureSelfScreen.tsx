import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { generateFutureSelfResponse } from '@/src/services/ai';
import { supabase } from '@/src/services/supabase';
import { useJourneyStore } from '@/src/store/useJourneyStore';
import { BRAND } from '@/src/theme/brand';
import { useTheme } from '@/src/theme/ThemeContext';

type Msg = { id: string; role: 'user' | 'future'; text: string };

export default function FutureSelfScreen() {
  const theme = useTheme();
  const onboardingAnswers = useJourneyStore((s) => s.onboardingAnswers);
  const identitySnapshots = useJourneyStore((s) => s.identitySnapshots);
  const entries = useJourneyStore((s) => s.entries);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: '0',
      role: 'future',
      text: "I'm the you who already did the hard thing. What's on your heart?",
    },
  ]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    try {
      const recentMirror = entries.find((e) => e.entry_type === 'mirror');
      const mirrorText =
        recentMirror && typeof (recentMirror.content as { snapshot?: string })?.snapshot === 'string'
          ? String((recentMirror.content as { snapshot: string }).snapshot)
          : undefined;
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      const reply = await generateFutureSelfResponse(text, {
        onboarding: onboardingAnswers ?? {},
        journeySummary: identitySnapshots[0]?.text,
        recentMirror: mirrorText,
      });
      setMessages((m) => [...m, { id: `f-${Date.now()}`, role: 'future', text: reply }]);
      if (uid) {
        await supabase.from('journey_entries').insert({
          user_id: uid,
          entry_type: 'future_self',
          content: {
            user: text,
            reply,
            at: new Date().toISOString(),
          },
        });
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: `e-${Date.now()}`,
          role: 'future',
          text: 'Connection hiccup — try again in a moment.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, onboardingAnswers, identitySnapshots, entries]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Future Self</Text>
          <View style={{ width: 26 }} />
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.role === 'user' ? styles.bubbleUser : styles.bubbleFuture,
                {
                  alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor:
                    item.role === 'user' ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.15)',
                },
              ]}
            >
              <Text style={[styles.bubbleText, { color: theme.textPrimary }]}>{item.text}</Text>
            </View>
          )}
        />

        <View style={[styles.inputRow, { borderTopColor: theme.cardBorder }]}>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.textPrimary,
                borderColor: theme.cardBorder,
                backgroundColor: theme.inputBg,
              },
            ]}
            placeholder="Speak to your future self…"
            placeholderTextColor={theme.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <Pressable
            onPress={send}
            disabled={loading || !input.trim()}
            style={[styles.send, (!input.trim() || loading) && { opacity: 0.4 }]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  list: { padding: 16, paddingBottom: 24, gap: 10 },
  bubble: {
    maxWidth: '88%',
    padding: 12,
    borderRadius: 14,
    marginBottom: 4,
  },
  bubbleUser: {},
  bubbleFuture: {},
  bubbleText: { fontSize: 15, lineHeight: 22 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: BRAND.primaryAction,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

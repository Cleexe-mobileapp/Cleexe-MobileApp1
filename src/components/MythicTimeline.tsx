import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { RoadmapStage } from '@/src/services/ai';
import { useJourneyStore } from '@/src/store/useJourneyStore';
import { BRAND } from '@/src/theme/brand';
import { useTheme } from '@/src/theme/ThemeContext';

export function MythicTimeline() {
  const theme = useTheme();
  const stages = useJourneyStore((s) => s.journeyStages);
  const mythicProgress = useJourneyStore((s) => s.mythicProgress);
  const saveMythicChapter = useJourneyStore((s) => s.saveMythicChapter);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [active, setActive] = useState<RoadmapStage | null>(null);

  const onOpen = (stage: RoadmapStage) => {
    setActive(stage);
    setDraft('');
    setOpen(true);
  };

  const onSave = async () => {
    if (!active || !draft.trim()) return;
    await saveMythicChapter(active.id, draft.trim());
    setOpen(false);
    setActive(null);
    setDraft('');
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Ionicons name="book" size={22} color={BRAND.primaryAction} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Mythic Timeline</Text>
      </View>
      <Text style={[styles.sub, { color: theme.textSecondary }]}>
        Your hero’s journey — one chapter at a time
      </Text>

      <ScrollView style={styles.scroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {stages.map((stage, idx) => {
          const prog = mythicProgress[stage.id];
          return (
            <View key={stage.id} style={[styles.stage, { borderColor: theme.cardBorder }]}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{idx + 1}</Text>
              </View>
              <Text style={[styles.stageTitle, { color: theme.textPrimary }]}>{stage.title}</Text>
              <Text style={[styles.stageSub, { color: theme.textSecondary }]}>{stage.subtitle}</Text>
              {prog?.lastExcerpt ? (
                <Text style={[styles.excerpt, { color: theme.textMuted }]} numberOfLines={3}>
                  Last: {prog.lastExcerpt}
                </Text>
              ) : (
                <Text style={[styles.excerpt, { color: theme.textMuted }]}>No entry yet</Text>
              )}
              <Pressable
                onPress={() => onOpen(stage)}
                style={({ pressed }) => [styles.chapterBtn, pressed && { opacity: 0.88 }]}
              >
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={styles.chapterBtnText}>Write Next Chapter</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={open} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheet, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {active?.title ?? 'Chapter'}
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  color: theme.textPrimary,
                  borderColor: theme.cardBorder,
                  backgroundColor: theme.inputBg,
                },
              ]}
              placeholder="What happened in this chapter?"
              placeholderTextColor={theme.textMuted}
              multiline
              value={draft}
              onChangeText={setDraft}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setOpen(false)} style={styles.cancelBtn}>
                <Text style={{ color: theme.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={onSave} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 4, marginBottom: 12 },
  scroll: { maxHeight: 420 },
  stage: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(139,92,246,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontWeight: '800', color: BRAND.primaryAction, fontSize: 12 },
  stageTitle: { fontSize: 17, fontWeight: '800', paddingRight: 36 },
  stageSub: { fontSize: 13, marginTop: 4 },
  excerpt: { fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  chapterBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND.primaryAction,
    paddingVertical: 10,
    borderRadius: 12,
  },
  chapterBtnText: { color: '#fff', fontWeight: '800' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  modalInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 16,
  },
  cancelBtn: { padding: 12 },
  saveBtn: {
    backgroundColor: BRAND.primaryAction,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveBtnText: { color: '#fff', fontWeight: '800' },
});

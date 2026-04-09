import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  PROFILE_CATEGORIES,
  categoryToSave,
  splitCategoryFromStorage,
  type ProfileCategory,
} from '@/src/constants/profileCategories';

const PURPLE = '#6B4EFF';
const OTHER_MAX = 48;
const CATEGORY_ICONS: Record<ProfileCategory, string> = {
  Athlete: '⚡',
  Student: '📘',
  Writer: '✍️',
  Entrepreneur: '🚀',
  Parent: '❤️',
  Teacher: '🍎',
  Designer: '🎨',
  Doctor: '🩺',
  Engineer: '🛠️',
  Artist: '🖌️',
  Musician: '🎵',
  Chef: '🍳',
  Coach: '🏁',
  Other: '💡',
};

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Current stored category (preset name or custom text like "Pilot"). */
  selected: string | null | undefined;
  /** Called when user confirms a category (preset tap or Done with Other). */
  onConfirm: (category: string) => void;
  title?: string;
};

export default function CategoryPickerModal({
  visible,
  onClose,
  selected,
  onConfirm,
  title = 'Choose category',
}: Props) {
  const insets = useSafeAreaInsets();
  const { preset: storedPreset } = splitCategoryFromStorage(selected);

  const [otherMode, setOtherMode] = useState(false);
  const [otherDraft, setOtherDraft] = useState('');

  useEffect(() => {
    if (!visible) return;
    const split = splitCategoryFromStorage(selected);
    setOtherDraft(split.customOther);
    setOtherMode(split.preset === 'Other');
  }, [visible, selected]);

  const handlePickPreset = useCallback(
    (c: ProfileCategory) => {
      if (c === 'Other') {
        setOtherMode(true);
        return;
      }
      setOtherMode(false);
      setOtherDraft('');
      onConfirm(c);
      onClose();
    },
    [onConfirm, onClose]
  );

  const handleDone = useCallback(() => {
    if (otherMode) {
      onConfirm(categoryToSave('Other', otherDraft));
    }
    onClose();
  }, [otherMode, otherDraft, onConfirm, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <Pressable style={styles.dismissArea} onPress={onClose} accessibilityRole="button" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={handleDone} hitSlop={12}>
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
          >
            {PROFILE_CATEGORIES.map((c) => {
              const isOtherRow = c === 'Other';
              const rowActive = isOtherRow
                ? otherMode || storedPreset === 'Other'
                : !otherMode && storedPreset === c;

              return (
                <Pressable
                  key={c}
                  onPress={() => handlePickPreset(c)}
                  style={({ pressed }) => [
                    styles.row,
                    rowActive && styles.rowActive,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowIcon}>{CATEGORY_ICONS[c]}</Text>
                    <Text style={[styles.rowText, rowActive && styles.rowTextActive]}>{c}</Text>
                  </View>
                  {rowActive ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            })}

            {otherMode ? (
              <TextInput
                style={styles.otherInput}
                value={otherDraft}
                onChangeText={(t) => setOtherDraft(t.slice(0, OTHER_MAX))}
                placeholder="What is your category?"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                autoCorrect
                returnKeyType="done"
                onSubmitEditing={handleDone}
              />
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,15,20,0.45)',
  },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    paddingHorizontal: 4,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  done: { fontSize: 16, fontWeight: '600', color: PURPLE },
  list: { paddingVertical: 8, paddingHorizontal: 12, paddingBottom: 28 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowIcon: { fontSize: 18 },
  rowActive: {
    backgroundColor: '#F5F3FF',
    borderColor: '#E0DCFF',
  },
  rowPressed: { opacity: 0.88 },
  rowText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  rowTextActive: { color: PURPLE },
  check: { fontSize: 16, fontWeight: '800', color: PURPLE },
  otherInput: {
    marginTop: 2,
    marginBottom: 6,
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 52,
    borderRadius: 14,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
});

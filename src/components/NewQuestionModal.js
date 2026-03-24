import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function NewQuestionModal({
  visible,
  onClose,
  onPost,
  circles = [],
  questionsRemaining = 0,
}) {
  const [text, setText] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [selectedCircles, setSelectedCircles] = useState({});
  const [wantsVideo, setWantsVideo] = useState(false);

  const reset = () => {
    setText('');
    setIsPublic(true);
    setSelectedCircles({});
    setWantsVideo(false);
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const toggleCircle = useCallback((id) => {
    setSelectedCircles((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  }, []);

  const handlePost = () => {
    if (text.trim().length < 10) {
      Alert.alert('Too short', 'Write at least 10 characters for your question.');
      return;
    }

    if (!isPublic && Object.keys(selectedCircles).length === 0) {
      Alert.alert('Select a circle', 'Private questions need at least one circle.');
      return;
    }

    const selectedIds = Object.keys(selectedCircles);
    const safeCircles = Array.isArray(circles) ? circles : [];
    const circleName = !isPublic && safeCircles.length > 0
      ? safeCircles.find((c) => c.id === selectedIds[0])?.name || 'My Circle'
      : null;

    if (typeof onPost === 'function') {
      onPost({
        text: text.trim(),
        isPublic,
        circleIds: isPublic ? [] : selectedIds,
        circleName,
        hasVideo: wantsVideo,
      });
    }

    reset();
  };

  const handleVideoRecord = () => {
    if (isPublic) {
      Alert.alert(
        '🎬 Circle Video',
        'Record a 15-second circle video to go with your question. This makes your question stand out and get 3x more replies!',
        [
          { text: 'Cancel' },
          {
            text: 'Record',
            onPress: () => {
              setWantsVideo(true);
              Alert.alert('Camera', 'expo-camera integration coming in next build. Video flag set!');
            },
          },
        ]
      );
    } else {
      Alert.alert('Premium Feature 🔒', 'Video in private circles is available for Cleexe Premium members.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>Ask a Question</Text>
            <Pressable onPress={handleClose} style={({ pressed }) => [pressed && styles.pressed]}>
              <Text style={styles.closeText}>Cancel</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Remaining Badge */}
            <View style={styles.remainingRow}>
              <Text style={styles.remainingText}>
                {questionsRemaining > 0
                  ? `${questionsRemaining} question${questionsRemaining !== 1 ? 's' : ''} remaining today (free)`
                  : 'Daily limit reached — upgrade for unlimited'}
              </Text>
            </View>

            {/* Public / Private Toggle */}
            <Text style={styles.sectionLabel}>Visibility</Text>
            <View style={styles.toggleRow}>
              <Pressable
                style={[styles.toggleBtn, isPublic && styles.toggleBtnActive]}
                onPress={() => setIsPublic(true)}
              >
                <Text style={styles.toggleEmoji}>🌐</Text>
                <View>
                  <Text style={[styles.toggleLabel, isPublic && styles.toggleLabelActive]}>Public</Text>
                  <Text style={styles.toggleDesc}>Everyone can see & reply</Text>
                </View>
              </Pressable>
              <Pressable
                style={[styles.toggleBtn, !isPublic && styles.toggleBtnActive]}
                onPress={() => setIsPublic(false)}
              >
                <Text style={styles.toggleEmoji}>🔒</Text>
                <View>
                  <Text style={[styles.toggleLabel, !isPublic && styles.toggleLabelActive]}>Private</Text>
                  <Text style={styles.toggleDesc}>Only your circles</Text>
                </View>
              </Pressable>
            </View>

            {/* Circle Selector (Private only) */}
            {!isPublic && (
              <View style={styles.circleSection}>
                <Text style={styles.sectionLabel}>Select Circles</Text>
                <View style={styles.circleGrid}>
                  {(Array.isArray(circles) ? circles : []).map((c) => {
                    const sel = !!selectedCircles[c.id];
                    return (
                      <Pressable
                        key={c.id}
                        style={[styles.circleChip, sel && styles.circleChipActive]}
                        onPress={() => toggleCircle(c.id)}
                      >
                        <Text style={styles.circleChipEmoji}>{c.emoji}</Text>
                        <Text style={[styles.circleChipName, sel && styles.circleChipNameActive]}>
                          {c.name}
                        </Text>
                        {sel && <Text style={styles.circleCheck}>✓</Text>}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Question Input */}
            <Text style={styles.sectionLabel}>Your Question</Text>
            <TextInput
              style={styles.input}
              placeholder="What would you like to ask?"
              placeholderTextColor="#9CA3AF"
              multiline
              value={text}
              onChangeText={setText}
              maxLength={500}
            />
            <Text style={styles.charCount}>{text.length}/500</Text>

            {/* Video Record */}
            <Pressable
              style={({ pressed }) => [styles.videoBtn, wantsVideo && styles.videoBtnActive, pressed && styles.pressed]}
              onPress={handleVideoRecord}
            >
              <Text style={styles.videoBtnIcon}>{wantsVideo ? '✅' : '🎬'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.videoBtnLabel, wantsVideo && styles.videoBtnLabelActive]}>
                  {wantsVideo ? 'Circle video attached' : 'Add circle video (15s)'}
                </Text>
                <Text style={styles.videoBtnHint}>
                  {wantsVideo ? 'Tap to remove' : 'Questions with video get 3x more replies'}
                </Text>
              </View>
              {!isPublic && <Text style={styles.premiumBadge}>PRO</Text>}
            </Pressable>

            {/* Post Button */}
            <Pressable
              style={({ pressed }) => [
                styles.postBtn,
                questionsRemaining <= 0 && styles.postBtnDisabled,
                pressed && styles.pressed,
              ]}
              onPress={handlePost}
              disabled={questionsRemaining <= 0}
            >
              <Text style={styles.postBtnText}>
                {questionsRemaining <= 0 ? 'Daily Limit Reached' : 'Post Question'}
              </Text>
            </Pressable>

            {/* Auto-delete Notice */}
            <Text style={styles.autoDeleteNotice}>
              Questions with video auto-delete after 24 hours to keep things fresh
            </Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40, maxHeight: '92%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 14 },
  pressed: { opacity: 0.7 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  closeText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },

  remainingRow: { backgroundColor: '#F5F3FF', borderRadius: 12, padding: 10, marginBottom: 18 },
  remainingText: { fontSize: 12, fontWeight: '600', color: '#6B4EFF', textAlign: 'center' },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#F0F0F5' },
  toggleBtnActive: { backgroundColor: '#F5F3FF', borderColor: '#6B4EFF' },
  toggleEmoji: { fontSize: 22 },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
  toggleLabelActive: { color: '#111827' },
  toggleDesc: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

  circleSection: { marginBottom: 18 },
  circleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  circleChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F9FAFB', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: '#F0F0F5' },
  circleChipActive: { backgroundColor: '#F5F3FF', borderColor: '#6B4EFF' },
  circleChipEmoji: { fontSize: 14 },
  circleChipName: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  circleChipNameActive: { color: '#6B4EFF' },
  circleCheck: { fontSize: 12, fontWeight: '700', color: '#6B4EFF' },

  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 16, fontSize: 15, color: '#1F2937', minHeight: 100, textAlignVertical: 'top', marginBottom: 4 },
  charCount: { fontSize: 11, color: '#D1D5DB', textAlign: 'right', marginBottom: 16 },

  videoBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#F0F0F5', marginBottom: 20 },
  videoBtnActive: { backgroundColor: '#F0FDF4', borderColor: '#059669' },
  videoBtnIcon: { fontSize: 22 },
  videoBtnLabel: { fontSize: 14, fontWeight: '700', color: '#374151' },
  videoBtnLabelActive: { color: '#059669' },
  videoBtnHint: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  premiumBadge: { fontSize: 10, fontWeight: '800', color: '#D97706', backgroundColor: '#FFFBEB', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },

  postBtn: { backgroundColor: '#6B4EFF', borderRadius: 999, paddingVertical: 15, alignItems: 'center', marginBottom: 12 },
  postBtnDisabled: { backgroundColor: '#D1D5DB' },
  postBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  autoDeleteNotice: { fontSize: 11, color: '#D1D5DB', textAlign: 'center', fontStyle: 'italic' },
});

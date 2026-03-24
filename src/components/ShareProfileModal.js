import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';

const PURPLE = '#6B4EFF';
const PURPLE_SOFT = '#F5F3FF';

function formatStat(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return '0';
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(num);
}

/** Instagram-story style card (9:16-ish) */
function StoryShareCard({ displayName, username, category, flow, heard, hears, achievements }) {
  return (
    <View style={storyStyles.wrap} collapsable={false}>
      <View style={storyStyles.inner}>
        <Text style={storyStyles.brand}>CLEEXE</Text>
        <Text style={storyStyles.name}>{displayName}</Text>
        <Text style={storyStyles.handle}>@{username.replace(/^@/, '')}</Text>
        <View style={storyStyles.pill}>
          <Text style={storyStyles.pillText}>{category}</Text>
        </View>
        <View style={storyStyles.statsRow}>
          <View style={storyStyles.statCol}>
            <Text style={storyStyles.statNum}>{formatStat(flow)}</Text>
            <Text style={storyStyles.statLab}>FLOW</Text>
          </View>
          <View style={storyStyles.statCol}>
            <Text style={storyStyles.statNum}>{formatStat(heard)}</Text>
            <Text style={storyStyles.statLab}>HEARD</Text>
          </View>
          <View style={storyStyles.statCol}>
            <Text style={storyStyles.statNum}>{formatStat(hears)}</Text>
            <Text style={storyStyles.statLab}>HEARS</Text>
          </View>
        </View>
        <Text style={storyStyles.achTitle}>Achievements</Text>
        {achievements.slice(0, 4).map((a) => (
          <Text key={a.title} style={storyStyles.achLine}>
            {a.earned ? '✓' : '○'} {a.title}
          </Text>
        ))}
        <View style={{ flex: 1, minHeight: 12 }} />
        <Text style={storyStyles.footer}>Join me on Cleexe</Text>
      </View>
    </View>
  );
}

const storyStyles = StyleSheet.create({
  wrap: {
    width: 280,
    height: 498,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0F0F14',
  },
  inner: {
    flex: 1,
    padding: 24,
    justifyContent: 'flex-start',
  },
  brand: {
    color: PURPLE,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 20,
  },
  name: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  handle: { color: 'rgba(255,255,255,0.55)', fontSize: 14, marginTop: 4 },
  pill: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(107,78,255,0.35)',
  },
  pillText: { color: '#E8E0FF', fontSize: 12, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    marginTop: 28,
    justifyContent: 'space-between',
    gap: 8,
  },
  statCol: { flex: 1, alignItems: 'flex-start' },
  statNum: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  statLab: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontStyle: 'italic',
    fontWeight: '600',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  achTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 28,
    marginBottom: 10,
  },
  achLine: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 6 },
  footer: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    textAlign: 'center',
    paddingTop: 8,
  },
});

export default function ShareProfileModal({
  visible,
  onClose,
  displayName,
  username,
  category,
  flowStat,
  heardStat,
  hearsStat,
  achievements,
  shareUrl,
}) {
  const insets = useSafeAreaInsets();
  const storyRef = useRef(null);
  const [storyModal, setStoryModal] = useState(false);
  const [sharing, setSharing] = useState(false);

  const copyLink = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(shareUrl);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Copied', 'Profile link is on your clipboard.');
    } catch {
      Alert.alert('Error', 'Could not copy link.');
    }
  }, [shareUrl]);

  const shareStoryImage = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not available', 'Story export works on iOS and Android.');
      return;
    }
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
        return;
      }
      setSharing(true);
      await new Promise((r) => setTimeout(r, 120));
      const uri = await captureRef(storyRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your Cleexe story',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn('share_story:', e);
      Alert.alert('Share failed', 'Could not create or share the image. Try again.');
    } finally {
      setSharing(false);
    }
  }, []);

  if (!visible) return null;

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={[styles.overlay, { paddingTop: insets.top }]}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Share profile</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={styles.close}>Done</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPad}>
              <Text style={styles.sectionLabel}>Scan in person</Text>
              <View style={styles.qrCard}>
                <View style={styles.qrInner}>
                  <QRCode value={shareUrl} size={168} color="#1F2937" backgroundColor="#FFFFFF" />
                </View>
                <Text style={styles.qrHint}>Branded QR · points to your Cleexe profile</Text>
              </View>

              <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]} onPress={copyLink}>
                <Text style={styles.primaryBtnText}>Copy profile link</Text>
                <Text style={styles.linkPreview} numberOfLines={1}>
                  {shareUrl}
                </Text>
              </Pressable>

              <Text style={styles.sectionLabel}>Social</Text>
              <Pressable
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                onPress={() => setStoryModal(true)}
              >
                <Text style={styles.secondaryBtnTitle}>Story export</Text>
                <Text style={styles.secondaryBtnSub}>
                  Generate a share card with Flow, Heard & Hears — perfect for Instagram Stories.
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={storyModal} animationType="fade" transparent onRequestClose={() => setStoryModal(false)}>
        <View style={styles.storyOverlay}>
          <Text style={styles.storyTitle}>Preview</Text>
          <View style={styles.storyPreviewWrap} collapsable={false}>
            <View ref={storyRef} collapsable={false}>
              <StoryShareCard
                displayName={displayName}
                username={username}
                category={category}
                flow={flowStat}
                heard={heardStat}
                hears={hearsStat}
                achievements={achievements}
              />
            </View>
          </View>
          <View style={styles.storyActions}>
            <Pressable
              style={[styles.shareImageBtn, sharing && styles.disabledBtn]}
              onPress={shareStoryImage}
              disabled={sharing}
            >
              {sharing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.shareImageBtnText}>Share image</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setStoryModal(false)} style={styles.cancelStory}>
              <Text style={styles.cancelStoryText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,15,20,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    paddingBottom: 28,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginTop: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  close: { fontSize: 16, fontWeight: '700', color: PURPLE },
  scrollPad: { padding: 20, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  qrCard: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: PURPLE_SOFT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E0FF',
    marginBottom: 16,
  },
  qrInner: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  qrHint: { fontSize: 12, color: '#6B7280', marginTop: 12, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  linkPreview: { fontSize: 13, color: PURPLE, marginTop: 6, fontWeight: '500' },
  secondaryBtn: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  secondaryBtnTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  secondaryBtnSub: { fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 18 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  storyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    padding: 20,
  },
  storyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  storyPreviewWrap: {
    alignItems: 'center',
  },
  storyActions: { marginTop: 24, gap: 12 },
  shareImageBtn: {
    backgroundColor: PURPLE,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  shareImageBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  disabledBtn: { opacity: 0.7 },
  cancelStory: { paddingVertical: 12, alignItems: 'center' },
  cancelStoryText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },
});

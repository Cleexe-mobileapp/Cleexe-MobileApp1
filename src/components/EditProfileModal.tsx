import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CategoryPickerModal from '@/src/components/CategoryPickerModal';
import {
  DEFAULT_PROFILE_CATEGORY,
  categoryToSave,
  splitCategoryFromStorage,
  type ProfileCategory,
} from '@/src/constants/profileCategories';
import { pickAndUploadAvatar } from '@/src/lib/avatarUpload';
import { consoleWarnOnce } from '@/src/lib/devConsoleOnce';
import { mergeProfileWithMetadata, saveProfileEdits } from '@/src/lib/profilePersistence';
import { supabase } from '@/src/services/supabase';

const PURPLE = '#6B4EFF';
const BIO_MAX = 160;

type ProfileRow = {
  username: string;
  bio: string | null;
  avatar_url: string | null;
  category: string | null;
};

export type EditProfileModalProps = {
  /** When false, render fullscreen sheet content (Expo Router stack modal). When true, use RN Modal. */
  useNativeModal?: boolean;
  visible?: boolean;
  onClose: () => void;
  userId: string;
  /** Called after a successful save */
  onSaved?: () => void;
};

export default function EditProfileModal({
  useNativeModal = false,
  visible = true,
  onClose,
  userId,
  onSaved,
}: EditProfileModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [categoryPreset, setCategoryPreset] = useState<ProfileCategory>(DEFAULT_PROFILE_CATEGORY);
  const [customOther, setCustomOther] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: auth }, { data: profile, error }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from('profiles')
          .select('username, bio, avatar_url, category')
          .eq('id', userId)
          .maybeSingle(),
      ]);

      if (error) {
        consoleWarnOnce(
          'cleexe_edit_profile_load',
          'edit_profile_load:',
          error.message,
          '→ Run supabase/manual/CREATE_PUBLIC_PROFILES.sql (or refresh API schema cache).'
        );
      }

      const meta = auth?.user?.user_metadata as Record<string, string | undefined> | undefined;
      const row = profile as ProfileRow | null;
      const merged = mergeProfileWithMetadata(row, meta);

      const name =
        meta?.full_name ||
        meta?.name ||
        meta?.display_name ||
        merged.username ||
        'Cleexe User';

      setDisplayName(String(name));
      setUsername(merged.username);
      setBio(merged.bio);
      setAvatarUrl(merged.avatar_url);
      const catSplit = splitCategoryFromStorage(merged.category);
      setCategoryPreset(catSplit.preset);
      setCustomOther(catSplit.customOther);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    if (useNativeModal && !visible) return;
    load();
  }, [userId, load, useNativeModal, visible]);

  const handleAvatar = async () => {
    setUploading(true);
    try {
      const url = await pickAndUploadAvatar(userId);
      if (url) setAvatarUrl(url);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const name = displayName.trim();
    const u = username.trim().replace(/^@+/, '').replace(/\s+/g, '_');
    if (!name) {
      Alert.alert('Name required', 'Please enter your display name.');
      return;
    }
    if (!u) {
      Alert.alert('Username required', 'Please enter a username.');
      return;
    }

    setSaving(true);
    try {
      const categorySaved = categoryToSave(categoryPreset, customOther);

      const result = await saveProfileEdits({
        userId,
        username: u,
        bio: bio.trim().slice(0, BIO_MAX),
        category: categorySaved,
        fullName: name,
      });

      if (!result.ok) {
        Alert.alert('Could not save', result.message);
        return;
      }

      onSaved?.();
      const subtitle = result.usedMetadataFallback
        ? 'Your Supabase project has no public.profiles table yet — we saved to your account (Auth) instead. Run Cleexe SQL migrations when ready.'
        : 'Your profile was updated.';
      Alert.alert('Saved', subtitle, [{ text: 'OK', onPress: onClose }]);
    } finally {
      setSaving(false);
    }
  };

  const body = (
    <>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => pressed && styles.hdrPressed}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <Pressable
          onPress={handleSave}
          disabled={saving || loading}
          hitSlop={12}
          style={({ pressed }) => pressed && styles.hdrPressed}
        >
          {saving ? (
            <ActivityIndicator size="small" color={PURPLE} />
          ) : (
            <Text style={styles.save}>Save</Text>
          )}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={styles.avatarBlock}
            onPress={handleAvatar}
            disabled={uploading}
          >
            <View style={styles.avatarRing}>
              {avatarUrl ? (
                <Image
                  key={avatarUrl}
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImg}
                  contentFit="cover"
                  cachePolicy="none"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.camBadge}>
                {uploading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                )}
              </View>
            </View>
            <Text style={styles.changePhoto}>Change profile photo</Text>
          </Pressable>

          <Text style={styles.label}>Display name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>Username</Text>
          <View style={styles.usernameField}>
            <Text style={styles.usernameAt}>@</Text>
            <TextInput
              style={[styles.input, styles.usernameInput]}
              value={username}
              onChangeText={(t) => setUsername(t.replace(/\s/g, '_').replace(/^@+/, ''))}
              placeholder="username"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={styles.label}>Category</Text>
          <Pressable
            style={({ pressed }) => [styles.categoryBtn, pressed && styles.pressed]}
            onPress={() => setCategoryOpen(true)}
          >
            <Text style={styles.categoryBtnText}>
              {categoryPreset === 'Other' && customOther.trim()
                ? customOther.trim()
                : categoryPreset}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#6B7280" />
          </Pressable>

          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={(t) => setBio(t.slice(0, BIO_MAX))}
            placeholder="A short bio"
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={BIO_MAX}
          />
          <Text style={styles.charCount}>
            {bio.length}/{BIO_MAX}
          </Text>
        </ScrollView>
      )}

      <CategoryPickerModal
        visible={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        selected={categoryToSave(categoryPreset, customOther)}
        onConfirm={(category) => {
          const split = splitCategoryFromStorage(category);
          setCategoryPreset(split.preset);
          setCustomOther(split.customOther);
        }}
      />
    </>
  );

  if (useNativeModal) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
          {body}
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  cancel: { fontSize: 16, color: '#6B7280', fontWeight: '500' },
  save: { fontSize: 16, color: PURPLE, fontWeight: '700' },
  hdrPressed: { opacity: 0.6 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  avatarBlock: { alignItems: 'center', marginBottom: 24 },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: PURPLE,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginBottom: 10,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  camBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  changePhoto: { fontSize: 14, fontWeight: '600', color: PURPLE },
  label: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  usernameField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingLeft: 12,
  },
  usernameAt: { fontSize: 15, color: '#9CA3AF', fontWeight: '600' },
  usernameInput: { flex: 1, borderWidth: 0, marginTop: 0, marginBottom: 0 },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FAFAFA',
  },
  categoryBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  bioInput: { minHeight: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 12, color: '#9CA3AF', alignSelf: 'flex-end', marginTop: 4 },
  pressed: { opacity: 0.85 },
});

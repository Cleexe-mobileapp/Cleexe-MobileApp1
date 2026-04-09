import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import CategoryPickerModal from '@/src/components/CategoryPickerModal';
import ShareProfileModal from '@/src/components/ShareProfileModal';
import PostsGrid, { type PublicJournalPost } from '@/src/components/profile/PostsGrid';
import {
  AISummarySparkIcon,
  CameraBloomIcon,
  CategoryLeafTagIcon,
  EditLeafPencilIcon,
  FirstStreakIcon,
  GoalSetterIcon,
  PrivateLockSproutIcon,
  ProfileHaloIcon,
  ShareSpreadIcon,
  StreakBadgeIcon,
  TeamPlayerVineIcon,
} from '@/src/components/icons/CleexeIcons';
import { DEFAULT_PROFILE_CATEGORY } from '@/src/constants/profileCategories';
import { useAuthSession } from '@/src/context/AuthSessionProvider';
import { pickAndUploadAvatar } from '@/src/lib/avatarUpload';
import { consoleWarnOnce } from '@/src/lib/devConsoleOnce';
import { normalizeJournalRow } from '@/src/lib/journalRow';
import { mergeProfileWithMetadata, saveCategoryRemote } from '@/src/lib/profilePersistence';
import { profileShareUrl } from '@/src/lib/profileShareUrl';
import { supabase } from '@/src/services/supabase';
import { useTheme } from '@/src/theme/ThemeContext';

const ACHIEVEMENTS = [
  { title: 'First Streak', desc: 'Completed 7 days in a row', earned: true },
  { title: 'Goal Setter', desc: 'Created 10 goals', earned: true },
  { title: 'Team Player', desc: 'Joined 3 circles', earned: true },
  { title: 'Century Club', desc: 'Reach a 100 day streak', earned: false },
];

function AchievementGlyph({ title, earned }: { title: string; earned: boolean }) {
  const t = useTheme();
  const color = earned ? t.textPrimary : t.textMuted;
  if (title === 'First Streak') return <FirstStreakIcon size={18} color={earned ? t.accent : color} focused={earned} />;
  if (title === 'Goal Setter') return <GoalSetterIcon size={18} color={color} focused={earned} />;
  if (title === 'Team Player') return <TeamPlayerVineIcon size={18} color={color} focused={earned} />;
  return <StreakBadgeIcon size={18} color={color} focused={earned} />;
}

const SETTINGS_ITEMS = [
  { key: 'edit', label: 'Edit Profile', icon: 'person-outline' as const },
  { key: 'notif', label: 'Notifications', icon: 'notifications-outline' as const },
  { key: 'privacy', label: 'Privacy', icon: 'lock-closed-outline' as const },
  { key: 'help', label: 'Help & Support', icon: 'help-circle-outline' as const },
  { key: 'about', label: 'About Cleexe', icon: 'information-circle-outline' as const },
];

function formatStat(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(Math.round(n));
}

function FrostedPanel({ children, style }: { children: React.ReactNode; style?: object }) {
  const t = useTheme();
  return (
    <View style={[st.fpOuter, { borderRadius: t.cardRadius, shadowColor: t.cardShadowColor, shadowOffset: t.cardShadowOffset, shadowOpacity: t.cardShadowOpacity, shadowRadius: t.cardShadowRadius, elevation: t.cardElevation }, style]}>
      {Platform.OS === 'android' && (
        <View style={[StyleSheet.absoluteFill, { borderRadius: t.cardRadius, backgroundColor: t.tier === 'calm' ? 'rgba(255,255,255,0.90)' : t.cardBg }]} />
      )}
      <BlurView
        intensity={t.glassBlurIntensity}
        tint={t.tier === 'calm' ? 'light' : 'dark'}
        style={[st.fpBlur, { borderRadius: t.cardRadius, borderColor: t.cardBorder, backgroundColor: t.glassBg }]}
      >
        <View style={st.fpInner}>{children}</View>
      </BlurView>
    </View>
  );
}

export default function ProfileScreen() {
  const { session } = useAuthSession();
  const t = useTheme();
  const userId = session?.user?.id ?? '';

  const [loggingOut, setLoggingOut] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [displayName, setDisplayName] = useState('Cleexe User');
  const [username, setUsername] = useState('cleexe_dev');
  const [bio, setBio] = useState('');
  const [categoryLabel, setCategoryLabel] = useState<string>(DEFAULT_PROFILE_CATEGORY);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [flowCount, setFlowCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [posts, setPosts] = useState<PublicJournalPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  // ── Data fetching (unchanged logic) ──

  const refresh = useCallback(async () => {
    if (!userId) { setLoading(false); setPostsLoading(false); return; }
    setLoading(true);
    setPostsLoading(true);
    try {
      const [profileRes, authUserRes, goalsRes, followersRes, followingRes, postsRes] =
        await Promise.all([
          supabase.from('profiles').select('username, bio, avatar_url, category').eq('id', userId).maybeSingle(),
          supabase.auth.getUser(),
          supabase.from('goals').select('longest_streak').eq('user_id', userId),
          supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('followed_id', userId),
          supabase.from('follows').select('followed_id', { count: 'exact', head: true }).eq('follower_id', userId),
          supabase.from('journal_entries').select('*').eq('user_id', userId).eq('is_public', true).order('created_at', { ascending: false }).limit(40),
        ]);
      const profile = profileRes.data as { username: string; bio: string | null; avatar_url: string | null; category: string | null } | null;
      if (profileRes.error) consoleWarnOnce('cleexe_profile_load', 'profile_load:', profileRes.error.message);
      const meta = authUserRes.data.user?.user_metadata as Record<string, string | undefined> | undefined;
      const merged = mergeProfileWithMetadata(profile, meta);
      setDisplayName(meta?.full_name || meta?.name || meta?.display_name || merged.username?.replace(/_/g, ' ') || 'Cleexe User');
      setUsername(merged.username || 'user');
      setBio(merged.bio ?? '');
      setCategoryLabel(merged.category?.trim() || DEFAULT_PROFILE_CATEGORY);
      setAvatarUrl(merged.avatar_url);
      const streaks = (goalsRes.data ?? []).map((g) => g.longest_streak ?? 0);
      setFlowCount(streaks.length ? Math.max(...streaks) : 0);
      setFollowersCount(followersRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);
      if (postsRes.error) { consoleWarnOnce('cleexe_posts_load', 'posts_load:', postsRes.error.message); setPosts([]); }
      else setPosts((Array.isArray(postsRes.data) ? postsRes.data : []).map((r) => normalizeJournalRow(r as Record<string, unknown>)));
    } finally { setLoading(false); setPostsLoading(false); }
  }, [userId]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const shareUrl = useMemo(() => profileShareUrl(username), [username]);

  const onCategoryConfirm = async (next: string) => {
    setCategoryLabel(next);
    if (!userId) return;
    const result = await saveCategoryRemote(userId, next);
    if (!result.ok) Alert.alert('Could not update', result.message);
  };
  const handleAvatarPress = async () => {
    if (!userId) return;
    setAvatarUploading(true);
    try { const url = await pickAndUploadAvatar(userId); if (url) setAvatarUrl(url); } finally { setAvatarUploading(false); }
  };
  const performLogout = async () => {
    setLoggingOut(true);
    try {
      const uid = userId || null;
      await supabase.auth.signOut();
      router.replace('/(auth)/welcome');
      if (uid) await AsyncStorage.multiRemove([`@cleexe_onboarding_${uid}`, `@cleexe_onboarding_${uid}_answers`]).catch(() => {});
      await AsyncStorage.removeItem('@cleexe_onboarding_completed').catch(() => {});
    } catch (error) { console.warn('logout_error:', error); } finally { setLoggingOut(false); Alert.alert('Logged out', 'You have been signed out successfully.'); }
  };
  const handleLogout = () => Alert.alert('Sign Out', 'Are you sure you want to sign out of Cleexe?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign Out', style: 'destructive', onPress: performLogout }]);
  const handleSettingsTap = (key: string) => { if (key === 'edit') { router.push('/edit-profile'); return; } Alert.alert('Coming Soon', 'This feature is under development.'); };
  const handleAchievementTap = (a: (typeof ACHIEVEMENTS)[0]) => {
    if (a.earned) { Alert.alert(a.title, a.desc); } else { Alert.alert('Locked', `Complete: "${a.desc}" to unlock.`); }
  };
  const openPost = (post: PublicJournalPost) => Alert.alert('Journal', post.content, [{ text: 'OK' }]);

  if (!userId) {
    return (
      <SafeAreaView style={[st.safe, { backgroundColor: t.bg }]} edges={['top']}>
        <View style={st.centerFill}><Text style={{ color: t.textMuted, fontSize: 15 }}>Sign in to view your profile.</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[st.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <ScrollView style={st.scroll} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        {loading && <View style={st.topLoader}><ActivityIndicator color={t.textMuted} /></View>}

        {/* ── Header ── */}
        <Text style={[st.screenTitle, { color: t.textPrimary }]}>Profile</Text>

        {/* ── Avatar ── */}
        <View style={st.avatarArea}>
          <Pressable onPress={handleAvatarPress} disabled={avatarUploading}>
            <View style={[st.avatarRing, { borderColor: t.separator }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={st.avatarImg} contentFit="cover" />
              ) : (
                <View style={[st.avatarPlaceholder, { backgroundColor: t.surface }]}>
                  <ProfileHaloIcon size={44} color={t.textMuted} />
                </View>
              )}
            </View>
            <View style={[st.camBadge, { backgroundColor: t.textPrimary }]}>
              {avatarUploading ? <ActivityIndicator size="small" color={t.textOnPrimary} /> : <CameraBloomIcon size={13} color={t.textOnPrimary} focused />}
            </View>
          </Pressable>
        </View>

        <Text style={[st.displayName, { color: t.textPrimary }]}>{displayName}</Text>
        <Text style={[st.usernameText, { color: t.textMuted }]}>@{username.replace(/^@/, '')}</Text>

        <View style={st.chipRow}>
          <Pressable onPress={() => setCategoryOpen(true)} style={[st.categoryChip, { backgroundColor: t.primaryMuted }]}>
            <CategoryLeafTagIcon size={11} color={t.textSecondary} focused />
            <Text style={[st.categoryChipText, { color: t.textSecondary }]}>{categoryLabel}</Text>
          </Pressable>
        </View>

        <Text style={[st.bio, { color: t.textSecondary }]}>
          {bio || 'Add a short bio from Edit Profile.'}
        </Text>

        {/* ── Stats ── */}
        <View style={st.statsRow}>
          {[
            { value: formatStat(flowCount), label: 'FLOW', onPress: undefined },
            { value: formatStat(followersCount), label: 'HEARD', onPress: () => router.push({ pathname: '/followers', params: { userId } }) },
            { value: formatStat(followingCount), label: 'HEARS', onPress: () => router.push({ pathname: '/following', params: { userId } }) },
          ].map((stat) => (
            <Pressable key={stat.label} onPress={stat.onPress} style={({ pressed }) => [st.statCardWrap, pressed && stat.onPress ? { opacity: 0.8 } : undefined]}>
              <FrostedPanel style={st.statCard}>
                <Text style={[st.statValue, { color: t.textPrimary }]}>{stat.value}</Text>
                <Text style={[st.statLabel, { color: t.textMuted }]}>{stat.label}</Text>
              </FrostedPanel>
            </Pressable>
          ))}
        </View>

        {/* ── Actions ── */}
        <View style={st.actionRow}>
          <Pressable style={({ pressed }) => [st.actionBtn, { borderColor: t.separator }, pressed && st.actionPress]} onPress={() => router.push('/edit-profile')}>
            <EditLeafPencilIcon size={14} color={t.textSecondary} focused />
            <Text style={[st.actionBtnLabel, { color: t.textPrimary }]}>Edit Profile</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [st.actionBtn, st.actionBtnAccent, { backgroundColor: t.accent }, pressed && st.actionPress]} onPress={() => setShareOpen(true)}>
            <ShareSpreadIcon size={14} color={t.textOnAccent} focused />
            <Text style={[st.actionBtnLabel, { color: t.textOnAccent }]}>Share Profile</Text>
          </Pressable>
        </View>

        {/* ── AI Summary ── */}
        <FrostedPanel style={st.section}>
          <View style={st.aiRow}>
            <AISummarySparkIcon size={13} color={t.accent} focused />
            <Text style={[st.aiLabel, { color: t.accent }]}>AI Summary</Text>
          </View>
          <Text style={[st.aiBody, { color: t.textSecondary }]}>
            Since joining Cleexe, you&apos;ve set 12 goals, maintained a 47-day streak, and connected with 8
            teammates. Your consistency is in the top 15% of users.
          </Text>
        </FrostedPanel>

        {/* ── Achievements ── */}
        <Text style={[st.sectionTitle, { color: t.textPrimary }]}>Achievements</Text>
        <FrostedPanel style={st.section}>
          {ACHIEVEMENTS.map((a, idx) => (
            <Pressable
              key={a.title}
              style={({ pressed }) => [st.achRow, idx < ACHIEVEMENTS.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.separator }, !a.earned && { opacity: 0.45 }, pressed && { opacity: 0.7 }]}
              onPress={() => handleAchievementTap(a)}
            >
              <View style={[st.achIcon, { backgroundColor: a.earned ? t.primaryMuted : t.surface }]}>
                <AchievementGlyph title={a.title} earned={a.earned} />
              </View>
              <View style={st.achInfo}>
                <Text style={[st.achTitle, { color: t.textPrimary }]}>{a.title}</Text>
                <Text style={[st.achDesc, { color: t.textMuted }]}>{a.desc}</Text>
              </View>
              {a.earned ? (
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              ) : (
                <PrivateLockSproutIcon size={13} color={t.textMuted} />
              )}
            </Pressable>
          ))}
        </FrostedPanel>

        {/* ── Flow / Posts ── */}
        <Text style={[st.sectionTitle, { color: t.textPrimary }]}>Flow</Text>
        <PostsGrid posts={posts} loading={postsLoading} onOpenPost={openPost} />

        {/* ── Settings ── */}
        <Text style={[st.sectionTitle, { color: t.textPrimary }]}>Settings</Text>
        <FrostedPanel style={st.section}>
          {SETTINGS_ITEMS.map((item, idx) => (
            <Pressable
              key={item.key}
              style={({ pressed }) => [st.settingsRow, idx < SETTINGS_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.separator }, pressed && { backgroundColor: t.surface }]}
              onPress={() => handleSettingsTap(item.key)}
            >
              <Ionicons name={item.icon} size={19} color={t.textSecondary} />
              <Text style={[st.settingsLabel, { color: t.textPrimary }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={15} color={t.textMuted} />
            </Pressable>
          ))}
        </FrostedPanel>

        {/* ── Sign Out ── */}
        <Pressable onPress={handleLogout} disabled={loggingOut} style={({ pressed }) => [st.logoutBtn, pressed && { opacity: 0.7 }]}>
          {loggingOut ? <ActivityIndicator size="small" color="#D32F2F" /> : (
            <>
              <Ionicons name="log-out-outline" size={17} color="#D32F2F" />
              <Text style={st.logoutText}>Sign Out</Text>
            </>
          )}
        </Pressable>
        <Text style={[st.version, { color: t.textMuted }]}>Cleexe v1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      <CategoryPickerModal visible={categoryOpen} onClose={() => setCategoryOpen(false)} selected={categoryLabel} onConfirm={onCategoryConfirm} />
      <ShareProfileModal visible={shareOpen} onClose={() => setShareOpen(false)} displayName={displayName} username={username} category={categoryLabel} flowStat={flowCount} heardStat={followersCount} hearsStat={followingCount} achievements={ACHIEVEMENTS} shareUrl={shareUrl} />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 28, paddingBottom: 100, alignItems: 'center' },
  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topLoader: { paddingVertical: 24, alignItems: 'center', width: '100%' },

  screenTitle: { fontSize: 16, fontWeight: '600', letterSpacing: 0.6, marginTop: 8, marginBottom: 28, textTransform: 'uppercase' },

  avatarArea: { alignItems: 'center', marginBottom: 18 },
  avatarRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 1, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  camBadge: { position: 'absolute', right: 2, bottom: 2, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#F5F5F7' },

  displayName: { fontSize: 26, fontWeight: '600', letterSpacing: -0.4, textAlign: 'center' },
  usernameText: { fontSize: 14, fontWeight: '400', marginTop: 4, textAlign: 'center' },

  chipRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  categoryChipText: { fontSize: 12, fontWeight: '600' },

  bio: { fontSize: 15, fontWeight: '400', lineHeight: 23, textAlign: 'center', marginTop: 20, paddingHorizontal: 16, maxWidth: 360 },

  statsRow: { flexDirection: 'row', gap: 12, marginTop: 32, marginBottom: 32, width: '100%', maxWidth: 440 },
  statCardWrap: { flex: 1 },
  statCard: { alignItems: 'center', paddingVertical: 20 },
  statValue: { fontSize: 24, fontWeight: '600', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.6, marginTop: 8, textTransform: 'uppercase' },

  actionRow: { flexDirection: 'row', gap: 12, width: '100%', maxWidth: 440, marginBottom: 32 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, borderWidth: 1 },
  actionBtnAccent: { borderWidth: 0 },
  actionPress: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  actionBtnLabel: { fontSize: 14, fontWeight: '600' },

  section: { width: '100%', maxWidth: 440, marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8, marginBottom: 14, marginTop: 12, width: '100%', maxWidth: 440, textTransform: 'uppercase' },

  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  aiLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  aiBody: { fontSize: 14, fontWeight: '400', lineHeight: 22 },

  achRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16 },
  achIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  achInfo: { flex: 1 },
  achTitle: { fontSize: 14, fontWeight: '600' },
  achDesc: { fontSize: 12, fontWeight: '400', marginTop: 3 },

  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 },
  settingsLabel: { flex: 1, fontSize: 15, fontWeight: '400' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32, paddingVertical: 14, paddingHorizontal: 36, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(211,47,47,0.15)' },
  logoutText: { color: '#D32F2F', fontSize: 14, fontWeight: '600' },
  version: { textAlign: 'center', fontSize: 11, fontWeight: '400', marginTop: 16 },

  fpOuter: { overflow: 'hidden' },
  fpBlur: { overflow: 'hidden', borderWidth: 1 },
  fpInner: { padding: 22 },
});

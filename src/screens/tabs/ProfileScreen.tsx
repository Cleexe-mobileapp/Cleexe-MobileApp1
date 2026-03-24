import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
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

import CategoryPickerModal from '@/src/components/CategoryPickerModal';
import ShareProfileModal from '@/src/components/ShareProfileModal';
import PostsGrid, { type PublicJournalPost } from '@/src/components/profile/PostsGrid';
import { DEFAULT_PROFILE_CATEGORY } from '@/src/constants/profileCategories';
import { useAuthSession } from '@/src/context/AuthSessionProvider';
import { pickAndUploadAvatar } from '@/src/lib/avatarUpload';
import { consoleWarnOnce } from '@/src/lib/devConsoleOnce';
import { normalizeJournalRow } from '@/src/lib/journalRow';
import { mergeProfileWithMetadata, saveCategoryRemote } from '@/src/lib/profilePersistence';
import { profileShareUrl } from '@/src/lib/profileShareUrl';
import { supabase } from '@/src/services/supabase';
import { ProfileStripePayButton } from '@/src/components/profile/ProfileStripePayButton';
import { isStripeNativeConfigured } from '@/src/components/StripeRootProvider';
import {
  getEntitlementStatus,
  purchaseFromCurrentOffering,
  restoreEntitlement,
} from '@/src/services/purchases';

const PURPLE = '#6B4EFF';
const ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID;

const ACHIEVEMENTS = [
  { title: 'First Streak', desc: 'Completed 7 days in a row', earned: true },
  { title: 'Goal Setter', desc: 'Created 10 goals', earned: true },
  { title: 'Team Player', desc: 'Joined 3 circles', earned: true },
  { title: 'Century Club', desc: 'Reach a 100 day streak', earned: false },
];

const SETTINGS_ITEMS = [
  { key: 'edit', label: 'Edit Profile', icon: 'person-outline' as const, color: PURPLE },
  { key: 'notif', label: 'Notifications', icon: 'notifications-outline' as const, color: PURPLE },
  { key: 'privacy', label: 'Privacy', icon: 'lock-closed-outline' as const, color: PURPLE },
  { key: 'help', label: 'Help & Support', icon: 'help-circle-outline' as const, color: PURPLE },
  { key: 'about', label: 'About Cleexe', icon: 'information-circle-outline' as const, color: PURPLE },
];

function formatStat(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(Math.round(n));
}

export default function ProfileScreen() {
  const { session } = useAuthSession();
  const userId = session?.user?.id ?? '';

  const [loggingOut, setLoggingOut] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);

  const [displayName, setDisplayName] = useState('Cleexe User');
  const [username, setUsername] = useState('cleexe_dev');
  const [bio, setBio] = useState('');
  /** Exact string stored in DB (preset or custom "Other" text). */
  const [categoryLabel, setCategoryLabel] = useState<string>(DEFAULT_PROFILE_CATEGORY);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [flowCount, setFlowCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [posts, setPosts] = useState<PublicJournalPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setPostsLoading(false);
      return;
    }
    setLoading(true);
    setPostsLoading(true);
    try {
      const [
        profileRes,
        authUserRes,
        goalsRes,
        followersRes,
        followingRes,
        postsRes,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('username, bio, avatar_url, category')
          .eq('id', userId)
          .maybeSingle(),
        supabase.auth.getUser(),
        supabase.from('goals').select('longest_streak').eq('user_id', userId),
        supabase
          .from('follows')
          .select('follower_id', { count: 'exact', head: true })
          .eq('followed_id', userId),
        supabase
          .from('follows')
          .select('followed_id', { count: 'exact', head: true })
          .eq('follower_id', userId),
        supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', userId)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(40),
      ]);

      const profile = profileRes.data as {
        username: string;
        bio: string | null;
        avatar_url: string | null;
        category: string | null;
      } | null;

      if (profileRes.error) {
        consoleWarnOnce(
          'cleexe_profile_load',
          'profile_load:',
          profileRes.error.message,
          '→ Run supabase/manual/CREATE_PUBLIC_PROFILES.sql (or refresh API schema cache).'
        );
      }

      const meta = authUserRes.data.user?.user_metadata as Record<string, string | undefined> | undefined;
      const merged = mergeProfileWithMetadata(profile, meta);
      const nameFromMeta = meta?.full_name || meta?.name || meta?.display_name;
      setDisplayName(
        nameFromMeta || merged.username?.replace(/_/g, ' ') || 'Cleexe User'
      );
      setUsername(merged.username || 'user');
      setBio(merged.bio ?? '');
      setCategoryLabel(merged.category?.trim() || DEFAULT_PROFILE_CATEGORY);
      setAvatarUrl(merged.avatar_url);

      const streaks = (goalsRes.data ?? []).map((g) => g.longest_streak ?? 0);
      setFlowCount(streaks.length ? Math.max(...streaks) : 0);

      setFollowersCount(followersRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);

      if (postsRes.error) {
        consoleWarnOnce(
          'cleexe_posts_load',
          'posts_load:',
          postsRes.error.message,
          '→ Ensure journal_entries exists. Optional columns: supabase/manual/ADD_JOURNAL_MEDIA_URL.sql, ADD_JOURNAL_DATE.sql'
        );
        setPosts([]);
      } else {
        const rows = Array.isArray(postsRes.data) ? postsRes.data : [];
        setPosts(rows.map((r) => normalizeJournalRow(r as Record<string, unknown>)));
      }
    } finally {
      setLoading(false);
      setPostsLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const refreshSubscription = useCallback(async () => {
    try {
      const active = await getEntitlementStatus(ENTITLEMENT_ID);
      setHasSubscription(active);
    } catch {
      setHasSubscription(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshSubscription();
    }, [refreshSubscription])
  );

  const shareUrl = useMemo(() => profileShareUrl(username), [username]);

  const onCategoryConfirm = async (next: string) => {
    setCategoryLabel(next);
    if (!userId) return;
    const result = await saveCategoryRemote(userId, next);
    if (!result.ok) {
      Alert.alert('Could not update', result.message);
    }
  };

  const handleAvatarPress = async () => {
    if (!userId) return;
    setAvatarUploading(true);
    try {
      const url = await pickAndUploadAvatar(userId);
      if (url) setAvatarUrl(url);
    } finally {
      setAvatarUploading(false);
    }
  };

  const performLogout = async () => {
    setLoggingOut(true);
    try {
      const uid = userId || null;
      await supabase.auth.signOut();
      router.replace('/(auth)/welcome');

      if (uid) {
        await AsyncStorage.multiRemove([
          `@cleexe_onboarding_${uid}`,
          `@cleexe_onboarding_${uid}_answers`,
        ]).catch(() => {});
      }
      await AsyncStorage.removeItem('@cleexe_onboarding_completed').catch(() => {});
    } catch (error) {
      console.warn('logout_error:', error);
    } finally {
      setLoggingOut(false);
      Alert.alert('Logged out', 'You have been signed out successfully.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of Cleexe?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: performLogout },
    ]);
  };

  const handleSettingsTap = (key: string) => {
    switch (key) {
      case 'edit':
        router.push('/edit-profile');
        break;
      default:
        Alert.alert('Coming Soon', 'This feature is under development.');
    }
  };

  const handleAchievementTap = (achievement: (typeof ACHIEVEMENTS)[0]) => {
    if (achievement.earned) {
      Alert.alert(achievement.title, achievement.desc);
    } else {
      Alert.alert('Locked', `Complete: "${achievement.desc}" to unlock this achievement.`);
    }
  };

  const openPost = (post: PublicJournalPost) => {
    Alert.alert('Journal', post.content, [{ text: 'OK' }]);
  };

  const handleUpgrade = async () => {
    setSubscriptionLoading(true);
    try {
      const result = await purchaseFromCurrentOffering(ENTITLEMENT_ID);
      if (result.cancelled) return;
      setHasSubscription(result.hasEntitlement);
      if (result.hasEntitlement) {
        Alert.alert('Success', 'Subscription activated.');
      } else {
        Alert.alert('Not active yet', 'Purchase completed, but entitlement is not active.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to complete purchase.';
      Alert.alert('Purchase failed', message);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleRestore = async () => {
    setSubscriptionLoading(true);
    try {
      const restored = await restoreEntitlement(ENTITLEMENT_ID);
      setHasSubscription(restored);
      Alert.alert(
        restored ? 'Restored' : 'No purchases found',
        restored
          ? 'Your subscription is now active on this account.'
          : 'We could not find an active subscription to restore.'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to restore purchases.';
      Alert.alert('Restore failed', message);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  if (!userId) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centerFill}>
          <Text style={styles.muted}>Sign in to view your profile.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.topLoader}>
            <ActivityIndicator color={PURPLE} />
          </View>
        ) : null}

        {/* Stats */}
        <View style={[styles.statsRowTop, styles.centerColumn]}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatStat(flowCount)}</Text>
            <Text style={styles.statLabel}>FLOW</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.statCard, pressed && styles.statPressed]}
            onPress={() => router.push({ pathname: '/followers', params: { userId } })}
          >
            <Text style={styles.statValue}>{formatStat(followersCount)}</Text>
            <Text style={styles.statLabel}>HEARD</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.statCard, pressed && styles.statPressed]}
            onPress={() => router.push({ pathname: '/following', params: { userId } })}
          >
            <Text style={styles.statValue}>{formatStat(followingCount)}</Text>
            <Text style={styles.statLabel}>HEARS</Text>
          </Pressable>
        </View>

        {/* Identity */}
        <View style={[styles.identityBlock, styles.centerColumn]}>
          <Pressable onPress={handleAvatarPress} disabled={avatarUploading} style={styles.avatarPress}>
            <View style={styles.avatarRing}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.camBadge}>
                {avatarUploading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="camera" size={15} color="#FFFFFF" />
                )}
              </View>
            </View>
          </Pressable>

          <Text style={styles.displayName}>{displayName}</Text>

          <View style={styles.usernameRow}>
            <Text style={styles.username}>@{username.replace(/^@/, '')}</Text>
            <Text style={styles.usernameDot}>•</Text>
            <Pressable onPress={() => setCategoryOpen(true)} style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{categoryLabel}</Text>
            </Pressable>
            <Text style={styles.usernameDot}>•</Text>
            <Pressable onPress={() => setCategoryOpen(true)} style={styles.updateCategoryBtn}>
              <Text style={styles.updateCategoryText}>Update category</Text>
              <Ionicons name="chevron-down" size={14} color="#6B7280" />
            </Pressable>
          </View>

          <Text style={styles.bio}>{bio || 'Add a short bio from Edit Profile.'}</Text>
        </View>

        {/* Actions */}
        <View style={[styles.actionRow, styles.centerColumn]}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            onPress={() => router.push('/edit-profile')}
          >
            <Text style={styles.actionBtnText}>Edit Profile</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            onPress={() => setShareOpen(true)}
          >
            <Text style={styles.actionBtnText}>Share Profile</Text>
          </Pressable>
        </View>

        <View style={[styles.aiSummary, styles.centerColumn]}>
          <Text style={styles.aiLabel}>✦ AI Summary</Text>
          <Text style={styles.aiText}>
            Since joining Cleexe, you&apos;ve set 12 goals, maintained a 47-day streak, and connected with 8
            teammates. Your consistency is in the top 15% of users.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, styles.centerColumn, styles.sectionTitleCentered]}>
          Achievements
        </Text>
        {ACHIEVEMENTS.map((a) => (
          <Pressable
            key={a.title}
            style={({ pressed }) => [
              styles.achievementRow,
              styles.centerColumn,
              !a.earned && styles.achievementLocked,
              pressed && styles.btnPressed,
            ]}
            onPress={() => handleAchievementTap(a)}
          >
            <View style={styles.achievementIconBox}>
              <Text style={styles.achievementIconMark}>{a.earned ? '🏆' : '?'}</Text>
            </View>
            <View style={styles.achievementInfo}>
              <Text style={[styles.achievementTitle, !a.earned && styles.lockedText]}>{a.title}</Text>
              <Text style={styles.achievementDesc}>{a.desc}</Text>
            </View>
            {a.earned ? (
              <Ionicons name="checkmark-circle" size={22} color="#059669" />
            ) : (
              <View style={styles.lockedMark}>
                <Text style={styles.lockedMarkText}>?</Text>
              </View>
            )}
          </Pressable>
        ))}

        <Text style={[styles.sectionTitle, styles.centerColumn, styles.sectionTitleCentered, { marginTop: 24 }]}>
          Flow
        </Text>
        <View style={styles.centerColumn}>
          <PostsGrid posts={posts} loading={postsLoading} onOpenPost={openPost} />
        </View>

        <Text style={[styles.sectionTitle, styles.centerColumn, styles.sectionTitleCentered, { marginTop: 24 }]}>
          Settings
        </Text>
        <View style={[styles.settingsCard, styles.centerColumn]}>
          {SETTINGS_ITEMS.map((item, idx) => (
            <Pressable
              key={item.key}
              style={({ pressed }) => [
                styles.settingsRow,
                idx < SETTINGS_ITEMS.length - 1 && styles.settingsRowBorder,
                pressed && styles.settingsRowPressed,
              ]}
              onPress={() => handleSettingsTap(item.key)}
            >
              <Ionicons name={item.icon} size={20} color={item.color} />
              <Text style={styles.settingsLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, styles.centerColumn, styles.sectionTitleCentered, { marginTop: 24 }]}>
          Subscription
        </Text>
        <View style={[styles.subscriptionCard, styles.centerColumn]}>
          <View style={styles.subscriptionHeader}>
            <Text style={styles.subscriptionTitle}>{hasSubscription ? 'Cleexe Pro Active' : 'Cleexe Free'}</Text>
            <View
              style={[
                styles.subscriptionBadge,
                hasSubscription ? styles.subscriptionBadgeActive : styles.subscriptionBadgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.subscriptionBadgeText,
                  hasSubscription ? styles.subscriptionBadgeTextActive : styles.subscriptionBadgeTextInactive,
                ]}
              >
                {hasSubscription ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          <Text style={styles.subscriptionDescription}>
            Unlock premium features with Cleexe Pro. Already subscribed? Restore purchases here.
          </Text>

          <View style={styles.subscriptionActions}>
            <Pressable
              style={({ pressed }) => [
                styles.subscriptionPrimaryBtn,
                (pressed || subscriptionLoading) && styles.subscriptionPrimaryBtnPressed,
              ]}
              onPress={handleUpgrade}
              disabled={subscriptionLoading}
            >
              {subscriptionLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.subscriptionPrimaryBtnText}>
                  {hasSubscription ? 'Manage / Change Plan' : 'Upgrade to Pro'}
                </Text>
              )}
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.subscriptionSecondaryBtn, pressed && styles.subscriptionSecondaryBtnPressed]}
              onPress={handleRestore}
              disabled={subscriptionLoading}
            >
              <Text style={styles.subscriptionSecondaryBtnText}>Restore Purchases</Text>
            </Pressable>
            {isStripeNativeConfigured() ? <ProfileStripePayButton /> : null}
          </View>
        </View>

        <Pressable
          onPress={handleLogout}
          disabled={loggingOut}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </>
          )}
        </Pressable>
        <Text style={styles.versionText}>Cleexe v1.0.0</Text>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <CategoryPickerModal
        visible={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        selected={categoryLabel}
        onConfirm={onCategoryConfirm}
      />

      <ShareProfileModal
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        displayName={displayName}
        username={username}
        category={categoryLabel}
        flowStat={flowCount}
        heardStat={followersCount}
        hearsStat={followingCount}
        achievements={ACHIEVEMENTS}
        shareUrl={shareUrl}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  content: {
    paddingTop: 12,
    paddingBottom: 100,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  /** Full-width blocks centered on screen (capped width on large devices). */
  centerColumn: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 440,
  },
  sectionTitleCentered: { textAlign: 'center' },
  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { color: '#6B7280', fontSize: 15 },
  topLoader: { paddingVertical: 16, alignItems: 'center', width: '100%' },

  statsRowTop: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8ED',
  },
  statPressed: { opacity: 0.88, backgroundColor: '#FAFAFA' },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 6,
    fontStyle: 'italic',
    fontWeight: '600',
    letterSpacing: 1.4,
  },

  identityBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarPress: { marginBottom: 4 },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: PURPLE,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  camBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  displayName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
    marginTop: 10,
    textAlign: 'center',
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  username: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  usernameDot: {
    fontSize: 14,
    color: '#D1D5DB',
    fontWeight: '500',
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#EDE9FE',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: PURPLE,
  },
  updateCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  updateCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  bio: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 8,
    maxWidth: 340,
    alignSelf: 'center',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionBtnPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: 0.2,
  },

  btnPressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },

  aiSummary: {
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0DCFF',
  },
  aiLabel: {
    color: PURPLE,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  aiText: { color: '#1F2937', fontSize: 14, lineHeight: 21, textAlign: 'center' },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  achievementLocked: { opacity: 0.55 },
  achievementIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  achievementIconMark: { fontSize: 18 },
  achievementInfo: { flex: 1 },
  achievementTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  lockedText: { color: '#9CA3AF' },
  achievementDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  lockedMark: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedMarkText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },

  settingsCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    marginBottom: 8,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  settingsRowPressed: { backgroundColor: '#F3F4F6' },
  settingsLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: '#1F2937' },

  subscriptionCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    padding: 16,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  subscriptionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  subscriptionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  subscriptionBadgeActive: { backgroundColor: '#DCFCE7' },
  subscriptionBadgeInactive: { backgroundColor: '#F3F4F6' },
  subscriptionBadgeText: { fontSize: 12, fontWeight: '700' },
  subscriptionBadgeTextActive: { color: '#166534' },
  subscriptionBadgeTextInactive: { color: '#6B7280' },
  subscriptionDescription: { color: '#4B5563', fontSize: 14, lineHeight: 20 },
  subscriptionActions: {
    marginTop: 14,
    gap: 10,
  },
  subscriptionPrimaryBtn: {
    backgroundColor: PURPLE,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  subscriptionPrimaryBtnPressed: { opacity: 0.85 },
  subscriptionPrimaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  subscriptionSecondaryBtn: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  subscriptionSecondaryBtnPressed: { opacity: 0.85, backgroundColor: '#F9FAFB' },
  subscriptionSecondaryBtnText: { color: '#374151', fontWeight: '600', fontSize: 14 },

  logoutButton: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  logoutPressed: { opacity: 0.75, transform: [{ scale: 0.97 }], backgroundColor: '#FEE2E2' },
  logoutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
  versionText: { textAlign: 'center', color: '#D1D5DB', fontSize: 12, marginTop: 14 },
  bottomSpacer: { height: 20 },
});

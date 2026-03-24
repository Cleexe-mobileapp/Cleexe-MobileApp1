import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated as RNAnimated,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../theme/ThemeContext';
import GlassCard from '../../components/ui/GlassCard';
import ChromeButton from '../../components/ui/ChromeButton';
import {
  DAILY_PROMPTS,
  FUTURE_SELF_REPLIES,
  INSIGHT_CARDS,
  COMMUNITY_POSTS,
  VIBE_EMOJIS,
  STREAK_SOCIAL_PROOF,
} from '../../data/feedTemplates';

const { width: SCREEN_W } = Dimensions.get('window');
const REPLY_CARD_W = SCREEN_W * 0.72;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function getDayOfYear() {
  return Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
}

function formatCount(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

function personalize(text, name, streak) {
  return text
    .replace(/\{\{NAME\}\}/g, name || 'friend')
    .replace(/\{\{STREAK\}\}/g, String(streak || 0));
}

function getTodayPrompt() {
  return DAILY_PROMPTS[getDayOfYear() % DAILY_PROMPTS.length];
}

function getStreakProof(streak) {
  if (streak >= 90) return STREAK_SOCIAL_PROOF[3];
  if (streak >= 30) return STREAK_SOCIAL_PROOF[4];
  if (streak >= 14) return STREAK_SOCIAL_PROOF[5];
  if (streak >= 7) return STREAK_SOCIAL_PROOF[0];
  return STREAK_SOCIAL_PROOF[1];
}

function pickFutureReplies(name, streak) {
  const tones = ['proud', 'sarcastic', 'threatening', 'hype', 'emotional'];
  const picked = [];
  for (const tone of tones) {
    const pool = FUTURE_SELF_REPLIES.filter((r) => r.tone === tone);
    const r = pool[Math.floor(Math.random() * pool.length)];
    if (r) picked.push({ ...r, text: personalize(r.text, name, streak) });
  }
  return picked.sort(() => Math.random() - 0.5).slice(0, 5);
}

function getInsightForSlot(slot) {
  return INSIGHT_CARDS[(getDayOfYear() + slot) % INSIGHT_CARDS.length];
}

const REPLY_BG_LIGHT = { proud: '#F5F3FF', sarcastic: '#FFF7ED', threatening: '#FEF2F2', hype: '#FFFBEB', emotional: '#F0FDF4' };
const REPLY_BG_DARK = { proud: 'rgba(139,92,246,0.12)', sarcastic: 'rgba(255,107,53,0.10)', threatening: 'rgba(239,68,68,0.10)', hype: 'rgba(255,209,102,0.10)', emotional: 'rgba(16,185,129,0.10)' };
const TONE_LABELS = { proud: 'Proud Future You', sarcastic: 'Sarcastic Future You', threatening: 'Tough Love Future You', hype: 'Hype Beast Future You', emotional: 'Emotional Future You' };

const QUICK_ACTIONS = [
  { key: 'goals', label: 'My Goals', icon: '🎯', href: '/(tabs)/growth' },
  { key: 'journal', label: 'Journal', icon: '✍️', href: null },
  { key: 'habits', label: 'Habits', icon: '🔁', href: '/(tabs)/growth' },
  { key: 'community', label: 'Community', icon: '👥', href: '/(tabs)/team' },
  { key: 'ask', label: 'Ask', icon: '💬', href: '/(tabs)/ask' },
];

// ─── Vibe Reactions ─────────────────────────────────────────────────────────

const VibeBar = React.memo(function VibeBar({ vibes, reacted, onReact, id, theme }) {
  const total = Object.values(vibes).reduce((s, v) => s + v, 0);
  return (
    <View style={[s.vibeBar, { borderTopColor: theme.separator }]}>
      {VIBE_EMOJIS.map((emoji) => {
        const count = vibes[emoji] || 0;
        const isActive = reacted === emoji;
        return (
          <Pressable
            key={emoji}
            style={({ pressed }) => [
              s.vibePill,
              { backgroundColor: theme.surface, borderColor: theme.cardBorder },
              isActive && { backgroundColor: theme.primaryMuted, borderColor: theme.primary },
              pressed && s.vibePillPressed,
            ]}
            onPress={() => onReact(id, emoji)}
          >
            <Text style={s.vibeEmoji}>{emoji}</Text>
            <Text style={[s.vibeCount, { color: theme.textMuted }, isActive && { color: theme.primary }]}>
              {formatCount(count + (isActive ? 1 : 0))}
            </Text>
          </Pressable>
        );
      })}
      <View style={{ flex: 1 }} />
      <Text style={[s.vibeTotalText, { color: theme.textMuted }]}>{formatCount(total)} vibes</Text>
    </View>
  );
});

// ─── Growth Nugget ──────────────────────────────────────────────────────────

const GrowthNugget = React.memo(function GrowthNugget({ item, theme }) {
  return (
    <View style={s.nuggetRow}>
      <View style={[s.nuggetDot, { backgroundColor: theme.accent }]} />
      <Text style={[s.nuggetText, { color: theme.textSecondary }]}>
        <Text style={[s.nuggetLabel, { color: theme.textPrimary }]}>Did you know? </Text>
        {item.text}
      </Text>
    </View>
  );
});

// ─── Feed Card ──────────────────────────────────────────────────────────────

const POST_TYPE_META = {
  win: { label: '🏆 Win', color: '#059669' },
  reflection: { label: '💭 Reflection', color: '#6B4EFF' },
  quote: { label: '✨ Quote', color: '#D97706' },
  insight: { label: '🧠 Insight', color: '#2563EB' },
  challenge: { label: '⚡ Challenge', color: '#DC2626' },
  stat: { label: '📊 Stats', color: '#7C3AED' },
  savage: { label: '🔥 Savage', color: '#FF6B35' },
  future: { label: '💬 Future Self', color: '#6B4EFF' },
  nugget: { label: '💡', color: '#6B7280' },
};

const FeedCard = React.memo(function FeedCard({ item, reaction, onReact, savageMode, theme }) {
  if (item.type === 'nugget') return <GrowthNugget item={item} theme={theme} />;

  const meta = POST_TYPE_META[item.type] || POST_TYPE_META.reflection;
  // Avoid Reanimated entering/layout on FlatList rows — Fabric + uiManagerDidDispatchCommand can crash on unmount (Expo Go).
  return (
    <View>
      <View style={[s.postCard, { backgroundColor: savageMode ? '#0D0D1A' : 'transparent' }]}>
        <View style={s.postUserRow}>
          <View style={[s.postAvatar, { backgroundColor: theme.surface, borderColor: theme.cardBorder, borderWidth: 1 }]}>
            <Text style={s.postAvatarText}>{item.avatar}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.postNameRow}>
              <Text style={[s.postUserName, { color: theme.textPrimary }]}>{item.user}</Text>
              {item.verified && <Text style={[s.verifiedBadge, { backgroundColor: theme.primary }]}>✓</Text>}
            </View>
            <Text style={[s.postTimeAgo, { color: theme.textMuted }]}>{item.timeAgo}</Text>
          </View>
          <View style={[s.postTypeBadge, { backgroundColor: theme.surface }]}>
            <Text style={[s.postTypeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        <Text style={[
          s.postText,
          { color: theme.textPrimary },
          item.type === 'quote' && s.postTextQuote,
        ]}>
          {item.text}
        </Text>
        <VibeBar vibes={item.vibes} reacted={reaction} onReact={onReact} id={item.id} theme={theme} />
      </View>
    </View>
  );
});

// ─── Main Component ────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

export default function HomeScreen() {
  const theme = useTheme();
  const isDark = theme.tier !== 'calm';

  const [userName, setUserName] = useState('');
  const [streak, setStreak] = useState(theme.streak || 47);

  const [reflectVisible, setReflectVisible] = useState(false);
  const [reflectText, setReflectText] = useState('');
  const [savageMode, setSavageMode] = useState(false);
  const [savageUsedToday, setSavageUsedToday] = useState(false);
  const [hasReflected, setHasReflected] = useState(false);
  const [futureReplies, setFutureReplies] = useState([]);

  const [reactions, setReactions] = useState({});
  const [feedPage, setFeedPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const savageShake = useRef(new RNAnimated.Value(0)).current;
  const replyFade = useRef(new RNAnimated.Value(0)).current;
  const todayPrompt = getTodayPrompt();

  useEffect(() => {
    (async () => {
      try {
        if (supabase) {
          const { data } = await supabase.auth.getUser();
          const meta = data?.user?.user_metadata;
          if (meta?.full_name) setUserName(meta.full_name.split(' ')[0]);
          else if (meta?.name) setUserName(meta.name.split(' ')[0]);
          else if (data?.user?.email) setUserName(data.user.email.split('@')[0]);
          if (meta?.streak) setStreak(meta.streak);
        }
      } catch (_e) { /* ignore */ }

      try {
        const val = await AsyncStorage.getItem('@cleexe_savage_date');
        if (val === getTodayKey()) setSavageUsedToday(true);
      } catch (_e) { /* ignore */ }
      try {
        const val = await AsyncStorage.getItem('@cleexe_reflected_date');
        if (val === getTodayKey()) {
          setHasReflected(true);
          setFutureReplies(pickFutureReplies(userName, streak));
          replyFade.setValue(1);
        }
      } catch (_e) { /* ignore */ }
    })();
  }, [replyFade, userName, streak]);

  // ── Build feed ──

  const feed = useMemo(() => {
    const day = getDayOfYear();
    const shuffled = [...COMMUNITY_POSTS].sort((a, b) => {
      const aV = Object.values(a.vibes).reduce((sv, v) => sv + v, 0);
      const bV = Object.values(b.vibes).reduce((sv, v) => sv + v, 0);
      return ((bV + day * 17) % 9999) - ((aV + day * 17) % 9999);
    });

    const savageCard = {
      id: 'savage_daily',
      type: 'savage',
      user: 'Savage Mode',
      avatar: '🔥',
      timeAgo: 'today',
      text: personalize(todayPrompt.savage, userName, streak),
      vibes: { '🔥': 999, '😂': 542, '💪': 187 },
      verified: true,
      isOfficial: true,
    };

    const result = [...shuffled];
    result.splice(2, 0, savageCard);

    if (hasReflected && futureReplies.length > 0) {
      result.splice(1, 0, {
        id: 'future_daily',
        type: 'future',
        user: `You, ${new Date().getFullYear() + 5}`,
        avatar: futureReplies[0].emoji,
        timeAgo: '5 years from now',
        text: futureReplies[0].text,
        vibes: { '😭': 342, '🔥': 201, '🙌': 156 },
        verified: false,
      });
    }

    const withNuggets = [];
    let nuggetSlot = 0;
    for (let i = 0; i < result.length; i++) {
      withNuggets.push(result[i]);
      if ((i + 1) % 3 === 0) {
        const insight = getInsightForSlot(nuggetSlot++);
        withNuggets.push({
          id: `nugget_${nuggetSlot}`,
          type: 'nugget',
          text: `${insight.stat} — ${insight.text}`,
        });
      }
    }
    return withNuggets;
  }, [todayPrompt, hasReflected, futureReplies, userName, streak]);

  const visibleFeed = useMemo(() => feed.slice(0, feedPage * PAGE_SIZE), [feed, feedPage]);
  const hasMore = visibleFeed.length < feed.length;

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setTimeout(() => { setFeedPage((p) => p + 1); setLoadingMore(false); }, 500);
  }, [hasMore, loadingMore]);

  // ── Actions ──

  const handleSavageToggle = useCallback(() => {
    if (savageMode) { setSavageMode(false); return; }
    if (savageUsedToday) {
      Alert.alert('Savage Limit 🔥', "One savage per day. Come back tomorrow for more roasts!");
      return;
    }
    setSavageMode(true);
    setSavageUsedToday(true);
    AsyncStorage.setItem('@cleexe_savage_date', getTodayKey()).catch(() => {});
    RNAnimated.sequence([
      RNAnimated.timing(savageShake, { toValue: 10, duration: 40, useNativeDriver: true }),
      RNAnimated.timing(savageShake, { toValue: -10, duration: 40, useNativeDriver: true }),
      RNAnimated.timing(savageShake, { toValue: 8, duration: 40, useNativeDriver: true }),
      RNAnimated.timing(savageShake, { toValue: -8, duration: 40, useNativeDriver: true }),
      RNAnimated.timing(savageShake, { toValue: 4, duration: 40, useNativeDriver: true }),
      RNAnimated.timing(savageShake, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, [savageMode, savageUsedToday, savageShake]);

  const handleQuickAction = (action) => {
    if (action.href) router.push(action.href);
    else Alert.alert(action.label, 'Coming soon!');
  };

  const handleReflectSubmit = useCallback(() => {
    if (reflectText.trim().length < 5) {
      Alert.alert('Too short', 'Write at least a few words.');
      return;
    }
    setHasReflected(true);
    const replies = pickFutureReplies(userName, streak);
    setFutureReplies(replies);
    AsyncStorage.setItem('@cleexe_reflected_date', getTodayKey()).catch(() => {});

    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.id) {
          supabase.from('reflections').insert({
            user_id: data.user.id,
            prompt: savageMode ? todayPrompt.savage : todayPrompt.normal,
            text: reflectText.trim(),
            savage_mode: savageMode,
            created_at: new Date().toISOString(),
          }).then(() => {}).catch(() => {});
        }
      }).catch(() => {});
    }

    setReflectText('');
    setReflectVisible(false);
    RNAnimated.timing(replyFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [reflectText, userName, streak, savageMode, todayPrompt, replyFade]);

  const handleVibeReact = useCallback((id, emoji) => {
    setReactions((prev) => ({ ...prev, [id]: prev[id] === emoji ? null : emoji }));
  }, []);

  const displayName = userName || 'friend';
  const replyBg = isDark ? REPLY_BG_DARK : REPLY_BG_LIGHT;

  // ── Header ──

  const renderHeader = () => (
    <View>
      {/* Gradient mesh background for header */}
      <LinearGradient
        colors={isDark ? [theme.bg, theme.bgDeep, theme.bg] : [theme.bg, theme.bgDeep, '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Greeting ── */}
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[s.greeting, { color: theme.textSecondary }]}>
            {getGreeting()}, <Text style={[s.greetingName, { color: theme.textPrimary }]}>{displayName}</Text>
          </Text>
        </View>
        <View style={[s.streakPill, { backgroundColor: theme.accentMuted, borderColor: theme.accent + '30' }]}>
          <Text style={s.streakFire}>🔥</Text>
          <Text style={[s.streakNum, { color: theme.accent }]}>{streak}</Text>
        </View>
      </View>

      <Text style={[s.streakProof, { color: theme.textMuted }]}>
        {streak}-day streak · {getStreakProof(streak)}
      </Text>

      {/* ── Hero Prompt (glass card) ── */}
      <RNAnimated.View style={{ transform: [{ translateX: savageShake }], marginHorizontal: 16, marginBottom: 20 }}>
        <GlassCard style={savageMode ? { borderColor: 'rgba(255,107,53,0.55)', borderWidth: 1.5 } : undefined}>
          {savageMode ? (
            <LinearGradient
              colors={['#120E14', '#1F1118', '#2A1318']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.savageHeroShell}
            >
              <View style={s.heroTopRow}>
                <View style={s.savageModeBadge}>
                  <Text style={s.savageModeBadgeText}>SAVAGE MODE</Text>
                </View>
                <Pressable
                  onPress={handleSavageToggle}
                  style={({ pressed }) => [s.modeSwitchPill, s.modeSwitchPillOn, pressed && s.btnPressed]}
                >
                  <Text style={s.modeSwitchTextOn}>Turn Off</Text>
                </Pressable>
              </View>

              <View style={s.heroPromptPanelDark}>
                <Text style={s.heroPromptSavage}>
                  {personalize(todayPrompt.savage, displayName, streak)}
                </Text>
              </View>

              <View style={s.heroActions}>
                <ChromeButton
                  label={hasReflected ? '✓ Reflected' : '✍️ Reflect Now'}
                  onPress={() => setReflectVisible(true)}
                  style={[{ flex: 1 }, hasReflected ? { backgroundColor: '#059669' } : { backgroundColor: '#FF6B35' }]}
                />
              </View>

              <Text style={s.savageLimitHintStrong}>
                1 savage per day · {savageUsedToday ? 'used today' : 'available'}
              </Text>
            </LinearGradient>
          ) : (
            <>
              {/* Mesh orbs */}
              <View style={[s.meshOrb, s.meshOrb1, { backgroundColor: theme.orbPrimary }]} />
              <View style={[s.meshOrb, s.meshOrb2, { backgroundColor: theme.orbSecondary }]} />

              <View style={s.heroTopRow}>
                <Text style={[s.heroLabel, { color: theme.primary }]}>DAILY PROMPT</Text>
                <Pressable
                  onPress={handleSavageToggle}
                  style={({ pressed }) => [s.modeSwitchPill, { borderColor: theme.cardBorder, backgroundColor: theme.surfaceElevated }, pressed && s.btnPressed]}
                >
                  <Text style={[s.modeSwitchTextOff, { color: theme.textSecondary }]}>Enable Savage</Text>
                </Pressable>
              </View>

              <View style={[s.heroPromptPanel, { backgroundColor: theme.surface }]}>
                <Text style={[s.heroPrompt, { color: theme.textPrimary }]}>
                  {todayPrompt.normal}
                </Text>
              </View>

              <View style={s.heroActions}>
                <ChromeButton
                  label={hasReflected ? '✓ Reflected' : '✍️ Reflect Now'}
                  onPress={() => setReflectVisible(true)}
                  style={[{ flex: 1 }, hasReflected && { backgroundColor: '#059669' }]}
                />
              </View>
            </>
          )}
        </GlassCard>
      </RNAnimated.View>

      {/* ── Future Self Carousel ── */}
      {hasReflected && futureReplies.length > 0 && (
        <RNAnimated.View style={{ opacity: replyFade, marginBottom: 16 }}>
          <View style={s.sectionHeaderRow}>
            <Text style={[s.sectionHeaderText, { color: theme.textPrimary }]}>💬 Your Future Self Replied</Text>
            <Text style={[s.sectionHint, { color: theme.textMuted }]}>swipe →</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={REPLY_CARD_W + 12}
            decelerationRate="fast"
            contentContainerStyle={s.carouselPad}
          >
            {futureReplies.map((r, i) => (
              <View key={i} style={[s.replyCard, { backgroundColor: replyBg[r.tone], borderColor: theme.cardBorder }]}>
                <Text style={s.replyEmoji}>{r.emoji}</Text>
                <Text style={[s.replyTone, { color: theme.primary }]}>{TONE_LABELS[r.tone]}</Text>
                <Text style={[s.replyText, { color: theme.textPrimary }]}>{r.text}</Text>
                <Text style={[s.replySig, { color: theme.textMuted }]}>— You, {new Date().getFullYear() + 5}</Text>
              </View>
            ))}
            <View style={[s.replyCardMore, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              <Text style={s.moreEmoji}>✨</Text>
              <Text style={[s.moreText, { color: theme.textMuted }]}>Reflect again{'\n'}tomorrow for{'\n'}new replies</Text>
            </View>
          </ScrollView>
        </RNAnimated.View>
      )}

      {/* ── Quick Actions ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipsRow}
        style={s.chipsScroll}
      >
        {QUICK_ACTIONS.map((a) => (
          <Pressable
            key={a.key}
            style={({ pressed }) => [
              s.chip,
              { backgroundColor: theme.surface, borderColor: theme.cardBorder },
              pressed && s.chipPressed,
            ]}
            onPress={() => handleQuickAction(a)}
          >
            <Text style={s.chipIcon}>{a.icon}</Text>
            <Text style={[s.chipLabel, { color: theme.textSecondary }]}>{a.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* ── Feed Title ── */}
      <View style={s.feedTitleRow}>
        <Text style={[s.feedTitle, { color: theme.textPrimary }]}>For You</Text>
        <Text style={[s.feedSubtitle, { color: theme.textMuted }]}>{savageMode ? 'No mercy ✦' : 'Positive vibes only ✦'}</Text>
      </View>
    </View>
  );

  // ── Footer ──

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={s.loadingMore}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[s.loadingMoreText, { color: theme.textMuted }]}>Loading more vibes...</Text>
        </View>
      );
    }
    if (!hasMore) {
      return (
        <View style={s.endOfFeed}>
          <Text style={s.endEmoji}>🌱</Text>
          <Text style={[s.endTitle, { color: theme.textPrimary }]}>{"You're all caught up"}</Text>
          <Text style={[s.endSub, { color: theme.textMuted }]}>Come back tomorrow for fresh content</Text>
        </View>
      );
    }
    return null;
  };

  // ── Render ──

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <FlatList
        data={visibleFeed}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedCard
            item={item}
            reaction={reactions[item.id]}
            onReact={handleVibeReact}
            savageMode={savageMode}
            theme={theme}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        ItemSeparatorComponent={() => <View style={[s.separator, { backgroundColor: theme.separator }]} />}
      />

      {/* ── Reflect Modal ── */}
      <Modal visible={reflectVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: isDark ? theme.bgDeep : '#FFFFFF' }]}>
            <View style={[s.modalHandle, { backgroundColor: theme.separator }]} />
            <Text style={[s.modalTitle, { color: theme.textPrimary }]}>
              {savageMode ? '🔥 Savage Reflection' : '✍️ Daily Reflection'}
            </Text>
            <Text style={[s.modalSubtitle, { color: theme.textSecondary }]}>
              {savageMode
                ? personalize(todayPrompt.savage, displayName, streak)
                : todayPrompt.normal}
            </Text>
            <TextInput
              style={[s.modalInput, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg, color: theme.textPrimary }]}
              placeholder={savageMode ? "Be brutally honest with yourself..." : "Write your honest reflection..."}
              placeholderTextColor={theme.textMuted}
              multiline
              value={reflectText}
              onChangeText={setReflectText}
              autoFocus
            />
            <Text style={[s.modalCharCount, { color: theme.textMuted }]}>
              {reflectText.length > 0 ? `${reflectText.length} characters` : ''}
            </Text>
            <View style={s.modalButtons}>
              <ChromeButton
                label="Cancel"
                variant="outline"
                onPress={() => { setReflectVisible(false); setReflectText(''); }}
                style={{ flex: 1 }}
              />
              <ChromeButton
                label="Save & See Replies"
                onPress={handleReflectSubmit}
                style={[{ flex: 1 }, savageMode && { backgroundColor: '#FF6B35' }]}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  listContent: { paddingBottom: 100 },
  btnPressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },

  /* Header */
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
  greeting: { fontSize: 15, fontWeight: '500' },
  greetingName: { fontWeight: '700' },

  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  streakFire: { fontSize: 14 },
  streakNum: { fontSize: 16, fontWeight: '900' },
  streakProof: { paddingHorizontal: 20, marginBottom: 14, fontSize: 12, fontWeight: '500' },

  /* Hero Card internals (GlassCard wraps the outer) */
  meshOrb: { position: 'absolute', borderRadius: 999 },
  meshOrb1: { width: 200, height: 200, top: -80, right: -60 },
  meshOrb2: { width: 140, height: 140, bottom: -50, left: -40 },

  savageHeroShell: { margin: -20, padding: 20, borderRadius: 24 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10 },
  heroLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2.2, textTransform: 'uppercase' },
  heroPromptPanel: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  heroPromptPanelDark: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 18, backgroundColor: 'rgba(0,0,0,0.42)', borderWidth: 1, borderColor: 'rgba(255,107,53,0.35)' },
  heroPrompt: { fontSize: 24, fontWeight: '700', lineHeight: 34 },
  heroPromptSavage: { fontSize: 24, fontWeight: '800', lineHeight: 35, color: '#FFF8F4', letterSpacing: -0.2 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  modeSwitchPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  modeSwitchPillOn: { backgroundColor: 'rgba(255,107,53,0.18)', borderColor: 'rgba(255,107,53,0.55)' },
  modeSwitchTextOn: { color: '#FFD8C9', fontSize: 12, fontWeight: '800' },
  modeSwitchTextOff: { fontSize: 12, fontWeight: '700' },
  savageModeBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: 'rgba(255,107,53,0.18)', borderWidth: 1, borderColor: 'rgba(255,107,53,0.5)' },
  savageModeBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4, color: '#FFB089' },
  savageLimitHintStrong: { color: '#FFC6AA', fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 12, opacity: 0.92 },

  /* Section Headers */
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  sectionHeaderText: { fontSize: 16, fontWeight: '800' },
  sectionHint: { fontSize: 12, fontWeight: '500' },

  /* Carousel */
  carouselPad: { paddingHorizontal: 20, gap: 12 },
  replyCard: { width: REPLY_CARD_W, borderRadius: 24, padding: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 3 },
  replyEmoji: { fontSize: 28, marginBottom: 6 },
  replyTone: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  replyText: { fontSize: 15, fontWeight: '600', lineHeight: 22, marginBottom: 10 },
  replySig: { fontSize: 12, fontStyle: 'italic' },
  replyCardMore: { width: REPLY_CARD_W * 0.55, borderRadius: 24, padding: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 3 },
  moreEmoji: { fontSize: 28, marginBottom: 8 },
  moreText: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 19 },

  /* Chips */
  chipsScroll: { marginBottom: 18 },
  chipsRow: { paddingHorizontal: 20, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1 },
  chipPressed: { transform: [{ scale: 0.96 }] },
  chipIcon: { fontSize: 14 },
  chipLabel: { fontSize: 12, fontWeight: '600' },

  /* Feed Title */
  feedTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 6 },
  feedTitle: { fontSize: 20, fontWeight: '800' },
  feedSubtitle: { fontSize: 11, fontWeight: '600' },

  /* Nugget */
  nuggetRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 20, marginVertical: 10, paddingVertical: 10 },
  nuggetDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  nuggetText: { flex: 1, fontSize: 13, fontWeight: '400', lineHeight: 19 },
  nuggetLabel: { fontWeight: '600' },

  /* Post Card */
  separator: { height: 1, marginHorizontal: 20 },
  postCard: { paddingHorizontal: 20, paddingVertical: 16 },
  postUserRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  postAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  postAvatarText: { fontSize: 16 },
  postNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postUserName: { fontSize: 14, fontWeight: '700' },
  verifiedBadge: { fontSize: 9, fontWeight: '800', color: '#FFFFFF', width: 15, height: 15, borderRadius: 8, textAlign: 'center', lineHeight: 15, overflow: 'hidden' },
  postTimeAgo: { fontSize: 11, marginTop: 1 },
  postTypeBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  postTypeText: { fontSize: 10, fontWeight: '700' },
  postText: { fontSize: 15, fontWeight: '500', lineHeight: 23 },
  postTextQuote: { fontSize: 17, fontWeight: '700', fontStyle: 'italic', lineHeight: 26 },

  /* Vibes */
  vibeBar: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12, paddingTop: 10, borderTopWidth: 1, flexWrap: 'wrap' },
  vibePill: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1 },
  vibePillPressed: { transform: [{ scale: 0.92 }] },
  vibeEmoji: { fontSize: 13 },
  vibeCount: { fontSize: 11, fontWeight: '700' },
  vibeTotalText: { fontSize: 10, fontWeight: '600' },

  /* Loading & End */
  loadingMore: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loadingMoreText: { fontSize: 13, fontWeight: '500' },
  endOfFeed: { alignItems: 'center', paddingVertical: 32, paddingBottom: 40 },
  endEmoji: { fontSize: 32, marginBottom: 8 },
  endTitle: { fontSize: 16, fontWeight: '700' },
  endSub: { fontSize: 13, marginTop: 4 },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 10 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  modalInput: { borderWidth: 1, borderRadius: 16, padding: 16, fontSize: 15, minHeight: 120, textAlignVertical: 'top', marginBottom: 4 },
  modalCharCount: { fontSize: 11, textAlign: 'right', marginBottom: 14 },
  modalButtons: { flexDirection: 'row', gap: 12 },
});

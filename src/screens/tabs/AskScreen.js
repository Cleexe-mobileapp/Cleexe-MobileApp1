import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { supabase } from '../../services/supabase';
import NewQuestionModal from '../../components/NewQuestionModal';
import {
  AskBubbleSeedIcon,
  AskButtonSeedIcon,
  BestAnswerBloomIcon,
  PrivateLockSproutIcon,
  PublicGlobeSproutIcon,
  ReactionHeartSproutIcon,
  ReactionIdeaSparkIcon,
  ReactionRiseVineIcon,
  ReplyLeafIcon,
  VideoBubblePlayIcon,
} from '../../components/icons/CleexeIcons';
import { useTheme } from '../../theme/ThemeContext';
import ChromeButton from '../../components/ui/ChromeButton';

const { width: SCREEN_W } = Dimensions.get('window');
const VIBE_REACTIONS = [
  { key: '🔥', Icon: ReactionHeartSproutIcon },
  { key: '😂', Icon: ReactionIdeaSparkIcon },
  { key: '💪', Icon: ReactionRiseVineIcon },
];
const FREE_DAILY_LIMIT = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const FREE_24H_COOLDOWN_MS = 10 * 60 * 60 * 1000;
const PREMIUM_24H_COOLDOWN_MS = 60 * 60 * 1000;
const V24H_ROW_HEIGHT = 108;

// ─── Dummy Data ───────────────────────────────────────────────────────────────

const DUMMY_PUBLIC = [
  { id: 'p1', text: 'How do you stay motivated when progress feels slow?', author: 'Sarah K.', avatar: '👩‍💼', timeAgo: '2h', replies: 14, bestReply: 'Break your big goal into tiny milestones. Celebrate each one.', vibes: { '🔥': 89, '😂': 12, '💪': 45 }, hasVideo: false, isPublic: true },
  { id: 'p2', text: 'What morning routine has changed your life the most?', author: 'James W.', avatar: '🧑‍💼', timeAgo: '4h', replies: 23, bestReply: '10 min meditation + cold shower + journaling. Game changer.', vibes: { '🔥': 201, '😂': 34, '💪': 112 }, hasVideo: false, isPublic: true },
  { id: 'p3', text: 'How do I find an accountability partner?', author: 'Aisha T.', avatar: '👩‍🎓', timeAgo: '6h', replies: 9, bestReply: "Join a Cleexe circle \u2014 you'll naturally find someone who matches your energy.", vibes: { '🔥': 56, '😂': 8, '💪': 31 }, hasVideo: false, isPublic: true },
  { id: 'p4', text: 'What is the single best book on building habits?', author: 'Dev P.', avatar: '🧑‍💻', timeAgo: '8h', replies: 31, bestReply: 'Atomic Habits by James Clear. Read it, then read it again.', vibes: { '🔥': 312, '😂': 67, '💪': 89 }, hasVideo: false, isPublic: true },
  { id: 'p5', text: 'Has anyone tried the 5-4-3-2-1 grounding technique for anxiety?', author: 'Luna S.', avatar: '🧑‍🎓', timeAgo: '10h', replies: 18, bestReply: 'Yes! It genuinely works. Focus on 5 things you can see, 4 you can touch...', vibes: { '🔥': 78, '😂': 5, '💪': 92 }, hasVideo: false, isPublic: true },
  { id: 'p6', text: 'How do you handle negative self-talk during tough days?', author: 'Marcus J.', avatar: '🧑‍🎨', timeAgo: '12h', replies: 27, bestReply: 'I write the negative thought down, then write 3 reasons it is wrong. Works every time.', vibes: { '🔥': 145, '😂': 23, '💪': 201 }, hasVideo: false, isPublic: true },
  { id: 'p7', text: 'What is one tiny habit that made a massive difference in your life?', author: 'Priya K.', avatar: '👩‍🔬', timeAgo: '14h', replies: 42, bestReply: 'Making my bed every morning. Sounds dumb, changes everything.', vibes: { '🔥': 267, '😂': 89, '💪': 156 }, hasVideo: false, isPublic: true },
  { id: 'p8', text: 'Circle video: My 30-day cold shower challenge results', author: 'Alex R.', avatar: '🧑‍💻', timeAgo: '1d', replies: 56, bestReply: null, vibes: { '🔥': 534, '😂': 201, '💪': 312 }, hasVideo: true, isPublic: true },
];

const DUMMY_PRIVATE = [
  { id: 'pr1', text: 'Hey team, anyone struggling with imposter syndrome at work this week?', author: 'You', avatar: '🫵', timeAgo: '1h', replies: 4, bestReply: "Every single day. But showing up IS the proof you belong.", vibes: { '🔥': 12, '😂': 3, '💪': 8 }, hasVideo: false, isPublic: false, circle: 'Career Growth' },
  { id: 'pr2', text: 'What supplements are you all taking for focus?', author: 'Nina L.', avatar: '👩‍🏫', timeAgo: '3h', replies: 7, bestReply: 'Omega-3 + Magnesium. Also: sleep 8 hours. That is the real supplement.', vibes: { '🔥': 23, '😂': 14, '💪': 19 }, hasVideo: false, isPublic: false, circle: 'Health & Wellness' },
  { id: 'pr3', text: 'Circle video: My honest experience with therapy after 6 months', author: 'Jordan T.', avatar: '🧑‍🎤', timeAgo: '5h', replies: 12, bestReply: null, vibes: { '🔥': 89, '😂': 5, '💪': 67 }, hasVideo: true, isPublic: false, circle: 'Mental Health' },
  { id: 'pr4', text: 'Does anyone else feel guilty when they take a rest day?', author: 'Aisha B.', avatar: '👩‍🍳', timeAgo: '8h', replies: 15, bestReply: 'Rest is not the opposite of productivity. It is the foundation of it.', vibes: { '🔥': 45, '😂': 8, '💪': 56 }, hasVideo: false, isPublic: false, circle: 'Mindset' },
];

const DUMMY_24H = [
  { id: 'v1', user_id: 'u1', author: 'Mia K.', avatar: '👩‍🚀', created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(), expires_at: new Date(Date.now() + (23 * 60 + 40) * 60 * 1000).toISOString(), video_url: 'mock://1', is_private: false },
  { id: 'v2', user_id: 'u2', author: 'Dylan R.', avatar: '🧑‍💻', created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(), expires_at: new Date(Date.now() + (22 * 60 + 30) * 60 * 1000).toISOString(), video_url: 'mock://2', is_private: false },
  { id: 'v3', user_id: 'u3', author: 'Noah T.', avatar: '🧑‍🎨', created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), expires_at: new Date(Date.now() + 19 * 60 * 60 * 1000).toISOString(), video_url: 'mock://3', is_private: true },
  { id: 'v4', user_id: 'u4', author: 'Sara N.', avatar: '👩‍🔬', created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), video_url: 'mock://4', is_private: false },
  { id: 'v5', user_id: 'u5', author: 'Leo G.', avatar: '🧑‍🎤', created_at: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(), expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), video_url: 'mock://5', is_private: false },
  { id: 'v6', user_id: 'u6', author: 'Zoe P.', avatar: '👩‍💼', created_at: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(), expires_at: new Date(Date.now() + 50 * 60 * 1000).toISOString(), video_url: 'mock://6', is_private: true },
];

const MY_CIRCLES = [
  { id: 'cir1', name: 'Career Growth', emoji: '💼', members: 234 },
  { id: 'cir2', name: 'Health & Wellness', emoji: '🧘', members: 189 },
  { id: 'cir3', name: 'Mental Health', emoji: '🧠', members: 312 },
  { id: 'cir4', name: 'Mindset', emoji: '🎯', members: 156 },
  { id: 'cir5', name: 'Side Hustles', emoji: '🚀', members: 98 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCount(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

function getTodayKey() {
  const d = new Date();
  return `@cleexe_ask_count_${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatCooldown(ms) {
  const safe = Math.max(0, ms);
  const h = Math.floor(safe / (1000 * 60 * 60));
  const m = Math.floor((safe % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((safe % (1000 * 60)) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function parseIntervalToMs(intervalStr) {
  if (!intervalStr || typeof intervalStr !== 'string') return null;
  const cleaned = intervalStr.trim().split('.')[0];
  const parts = cleaned.split(':').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return null;
  const [h = 0, m = 0, s = 0] = parts.slice(-3);
  return ((h * 60 * 60) + (m * 60) + s) * 1000;
}

function getExpiryMeta(expiresAt, nowMs) {
  const remainingMs = Math.max(0, new Date(expiresAt).getTime() - nowMs);
  const ratio = Math.max(0, Math.min(1, remainingMs / DAY_MS));
  const nearExpiry = remainingMs <= 60 * 60 * 1000;
  return {
    remainingMs,
    ratio,
    colors: nearExpiry ? ['#EF4444', '#F97316'] : ['#6B4EFF', '#A78BFA'],
  };
}

// ─── Vibe Bar ─────────────────────────────────────────────────────────────────

const VibeBar = React.memo(function VibeBar({ vibes, reacted, onReact, id }) {
  return (
    <View style={styles.vibeBar}>
      {VIBE_REACTIONS.map(({ key, Icon }) => {
        const count = vibes[key] || 0;
        const active = reacted === key;
        return (
          <Pressable
            key={key}
            style={({ pressed }) => [
              styles.vibePill,
              active && styles.vibePillActive,
              pressed && styles.vibePillPressed,
            ]}
            onPress={() => onReact(id, key)}
          >
            <View style={styles.vibeIconWrap}>
              <Icon
                size={14}
                color={active ? '#6B4EFF' : '#9CA3AF'}
                focused={active}
              />
            </View>
            <Text style={[styles.vibeCount, active && styles.vibeCountActive]}>
              {formatCount(count + (active ? 1 : 0))}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

// ─── Question Card ────────────────────────────────────────────────────────────

function QuestionCard({ item, reaction, onReact, theme }) {
  const isPrivate = !item.isPublic;
  return (
    <Pressable style={({ pressed }) => [styles.qCardPress, pressed && styles.qCardPressed]}>
      <View
        style={[
          styles.qCardShell,
          {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.04,
            shadowRadius: 16,
            elevation: 3,
          },
        ]}
      >
        <BlurView
          intensity={theme.glassBlurIntensity}
          tint={theme.glassBlurTint}
          style={[
            styles.qCardBlur,
            {
              backgroundColor: theme.glassBg,
              borderColor: isPrivate ? 'rgba(245,158,11,0.26)' : theme.glassBorder,
            },
          ]}
        >
          {/* Author Row */}
          <View style={styles.qAuthorRow}>
            <View style={[styles.qAvatar, { backgroundColor: theme.surface }]}>
              <Text style={styles.qAvatarText}>{item.avatar}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.qAuthorName, { color: theme.textPrimary }]}>{item.author}</Text>
              <View style={styles.qMetaRow}>
                <Text style={[styles.qTimeAgo, { color: theme.textMuted }]}>{item.timeAgo}</Text>
                {!item.isPublic && item.circle && (
                  <View style={styles.qCircleBadge}>
                    <Text style={styles.qCircleBadgeText}>{item.circle}</Text>
                  </View>
                )}
              </View>
            </View>
            {item.hasVideo && (
              <View style={styles.qVideoBadge}>
                <Text style={styles.qVideoIcon}>🎬</Text>
                <Text style={styles.qVideoLabel}>Video</Text>
              </View>
            )}
          </View>

          {/* Question Text */}
          <View style={styles.qQuestionRow}>
            <AskBubbleSeedIcon size={18} color={theme.textSecondary} />
            <Text style={[styles.qText, { color: theme.textPrimary }]}>{item.text}</Text>
          </View>

          {/* Video Thumbnail Placeholder */}
          {item.hasVideo && (
            <Pressable style={styles.qVideoThumb}>
              <View style={styles.qVideoCircleMask}>
                <Text style={styles.qVideoPlayIcon}>▶</Text>
              </View>
              <Text style={styles.qVideoPlayLabel}>Watch circle video</Text>
            </Pressable>
          )}

          {/* Reply Info */}
          <View style={styles.qReplyRow}>
            <View style={styles.qReplyCountWrap}>
              <ReplyLeafIcon size={14} color={theme.textSecondary} />
              <Text style={[styles.qReplyCount, { color: theme.textSecondary }]}>
                {item.replies} {item.replies === 1 ? 'reply' : 'replies'}
              </Text>
            </View>
            {item.bestReply && (
              <View style={styles.qBestBadge}>
                <BestAnswerBloomIcon size={11} color="#059669" />
                <Text style={styles.qBestBadgeText}>Best Answer</Text>
              </View>
            )}
          </View>

          {/* Best Reply */}
          {item.bestReply && (
            <View style={[styles.qBestCard, { borderColor: theme.primaryMuted }]}>
              <Text style={[styles.qBestText, { color: theme.textPrimary }]}>{item.bestReply}</Text>
            </View>
          )}

          {/* Vibe Reactions */}
          <VibeBar vibes={item.vibes} reacted={reaction} onReact={onReact} id={item.id} />
        </BlurView>
      </View>
    </Pressable>
  );
}

const MemoizedQuestionCard = React.memo(QuestionCard);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AskScreen() {
  const theme = useTheme();
  const deviceScheme = useColorScheme();
  const isDark = theme.tier !== 'calm' || deviceScheme === 'dark';
  const [activeTab, setActiveTab] = useState('public');
  const [modalVisible, setModalVisible] = useState(false);
  const [reactions, setReactions] = useState({});
  const [publicQuestions, setPublicQuestions] = useState(DUMMY_PUBLIC);
  const [privateQuestions, setPrivateQuestions] = useState(DUMMY_PRIVATE);
  const [v24hMessages, setV24hMessages] = useState(DUMMY_24H);
  const [selected24h, setSelected24h] = useState(null);
  const [questionsToday, setQuestionsToday] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [incognitoMode, setIncognitoMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [cooldownUntilMs, setCooldownUntilMs] = useState(0);
  const [nowMs, setNowMs] = useState(Date.now());

  const tabIndicator = useRef(new Animated.Value(0)).current;
  const extractItemKey = useCallback(
    (item, index) => item?.id?.toString() || `${item?.questionId || 'q'}-${item?.createdAt || item?.created_at || index}`,
    []
  );

  useEffect(() => {
    AsyncStorage.getItem(getTodayKey()).then((val) => {
      if (val) setQuestionsToday(parseInt(val, 10) || 0);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase?.auth?.getUser();
        const user = data?.user;
        if (!mounted || !user) return;
        setCurrentUserId(user.id);
        const premiumFlag = Boolean(
          user.user_metadata?.is_premium
          || user.user_metadata?.premium
          || user.user_metadata?.plan === 'premium'
        );
        setIsPremium(premiumFlag);
      } catch {
        // noop
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const evaluate24hCooldown = useCallback(async (userId, premiumFlag) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.rpc('can_user_post_24h', {
        user_uuid: userId,
        is_premium: premiumFlag,
      });
      if (!error && data) {
        if (data.can_post) {
          setCooldownUntilMs(0);
          return;
        }
        const remainingMs = parseIntervalToMs(String(data.remaining_time || ''));
        if (remainingMs && remainingMs > 0) {
          setCooldownUntilMs(Date.now() + remainingMs);
          return;
        }
      }
    } catch {
      // RPC may not exist yet, fallback below.
    }

    const storageKey = `@cleexe_24h_last_post_${userId}`;
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      const lastMs = Number(raw || 0);
      const cooldownMs = premiumFlag ? PREMIUM_24H_COOLDOWN_MS : FREE_24H_COOLDOWN_MS;
      const left = (lastMs + cooldownMs) - Date.now();
      setCooldownUntilMs(left > 0 ? Date.now() + left : 0);
    } catch {
      setCooldownUntilMs(0);
    }
  }, []);

  const fetch24hMessages = useCallback(async () => {
    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('v24h_messages')
        .select('id,user_id,video_url,thumbnail_url,is_private,created_at,expires_at')
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false })
        .limit(120);

      if (error) throw error;

      if (!Array.isArray(data) || data.length === 0) {
        setV24hMessages([]);
        return;
      }

      const userIds = Array.from(new Set(data.map((r) => r.user_id).filter(Boolean)));
      let profilesMap = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id,full_name')
          .in('id', userIds);
        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.full_name || 'Cleexe User';
          return acc;
        }, {});
      }

      const mapped = data.map((row, idx) => ({
        ...row,
        author: profilesMap[row.user_id] || `Cleexe User ${idx + 1}`,
        avatar: '🎥',
      }));
      setV24hMessages(mapped);
    } catch {
      // Keep local fallback for dev/demo.
      setV24hMessages(DUMMY_24H);
    }
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    evaluate24hCooldown(currentUserId, isPremium);
    fetch24hMessages();
  }, [currentUserId, isPremium, evaluate24hCooldown, fetch24hMessages]);

  useEffect(() => {
    Animated.spring(tabIndicator, {
      toValue: activeTab === 'public' ? 0 : activeTab === 'private' ? 1 : 2,
      useNativeDriver: true,
      tension: 300,
      friction: 30,
    }).start();
  }, [activeTab, tabIndicator]);

  const canPost24h = useMemo(() => cooldownUntilMs <= nowMs, [cooldownUntilMs, nowMs]);
  const cooldownLabel = useMemo(
    () => formatCooldown(Math.max(0, cooldownUntilMs - nowMs)),
    [cooldownUntilMs, nowMs]
  );
  const currentData = activeTab === 'public'
    ? publicQuestions
    : activeTab === 'private'
      ? privateQuestions
      : v24hMessages;

  const handleVibeReact = useCallback((id, emoji) => {
    setReactions((prev) => ({ ...prev, [id]: prev[id] === emoji ? null : emoji }));
  }, []);

  const handlePostQuestion = useCallback((question) => {
    if (questionsToday >= FREE_DAILY_LIMIT) {
      Alert.alert(
        'Daily Limit Reached',
        `Free users can ask ${FREE_DAILY_LIMIT} questions per day. Upgrade to Cleexe Premium for unlimited questions.`,
        [{ text: 'OK' }, { text: 'Learn More', onPress: () => Alert.alert('Premium', 'Coming soon!') }]
      );
      return;
    }

    const newQ = {
      id: `new_${Date.now()}`,
      text: question.text,
      author: 'You',
      avatar: '🫵',
      timeAgo: 'just now',
      replies: 0,
      bestReply: null,
      vibes: { '🔥': 0, '😂': 0, '💪': 0 },
      hasVideo: question.hasVideo || false,
      isPublic: question.isPublic,
      circle: question.circleName || null,
    };

    if (question.isPublic) {
      setPublicQuestions((prev) => [newQ, ...prev]);
    } else {
      setPrivateQuestions((prev) => [newQ, ...prev]);
    }

    const newCount = questionsToday + 1;
    setQuestionsToday(newCount);
    AsyncStorage.setItem(getTodayKey(), String(newCount)).catch(() => {});

    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.id) {
          supabase.from('ask_questions').insert({
            user_id: data.user.id,
            text: question.text,
            is_public: question.isPublic,
            circle_ids: question.circleIds || [],
            video_url: null,
            created_at: new Date().toISOString(),
          }).then(() => {}).catch(() => {});
        }
      }).catch(() => {});
    }

    setModalVisible(false);
    if (!question.isPublic) setActiveTab('private');
    Alert.alert('Posted! 🎉', 'Your question is live. The community will respond soon.');
  }, [questionsToday]);

  const mark24hPostNow = useCallback(async () => {
    if (!currentUserId) return;
    const key = `@cleexe_24h_last_post_${currentUserId}`;
    const now = Date.now();
    const cooldownMs = isPremium ? PREMIUM_24H_COOLDOWN_MS : FREE_24H_COOLDOWN_MS;
    setCooldownUntilMs(now + cooldownMs);
    try {
      await AsyncStorage.setItem(key, String(now));
    } catch {
      // noop
    }
  }, [currentUserId, isPremium]);

  const handlePost24hVideo = useCallback(async () => {
    if (!currentUserId) {
      Alert.alert('Sign in required', 'Please sign in to post a 24h video.');
      return;
    }
    if (!canPost24h) {
      Alert.alert('Cooldown active', `You can post again in ${cooldownLabel}`);
      return;
    }

    Alert.alert(
      'Post 24h Video',
      'Camera recording hook is next. For now, this publishes a placeholder 30s bubble with 24h expiry.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          onPress: async () => {
            const createdAt = new Date();
            const expiresAt = new Date(createdAt.getTime() + DAY_MS);
            const message = {
              id: `local_${Date.now()}`,
              user_id: currentUserId,
              author: 'You',
              avatar: '🫵',
              video_url: 'pending://recording',
              created_at: createdAt.toISOString(),
              expires_at: expiresAt.toISOString(),
              is_private: isPremium ? incognitoMode : false,
            };

            setV24hMessages((prev) => [message, ...prev]);
            await mark24hPostNow();

            try {
              await supabase.from('v24h_messages').insert({
                user_id: currentUserId,
                video_url: message.video_url,
                thumbnail_url: null,
                is_private: message.is_private,
                created_at: message.created_at,
                expires_at: message.expires_at,
              });
            } catch {
              // ignore in foundation mode
            }
          },
        },
      ]
    );
  }, [canPost24h, cooldownLabel, currentUserId, incognitoMode, isPremium, mark24hPostNow]);

  const renderItem = useCallback(({ item }) => (
    <MemoizedQuestionCard item={item} reaction={reactions[item.id]} onReact={handleVibeReact} theme={theme} />
  ), [reactions, handleVibeReact, theme]);

  const render24hBubble = useCallback(({ item }) => {
    const expiry = getExpiryMeta(item.expires_at, nowMs);
    const lockProfile = !isPremium;
    const name = lockProfile ? 'Locked Profile' : (item.is_private ? 'Incognito' : item.author);
    const isOwnMessage = currentUserId && item.user_id === currentUserId;

    return (
      <Pressable style={styles.v24hItem} onPress={() => setSelected24h(item)}>
        <LinearGradient colors={expiry.colors} style={styles.v24hRing}>
          <View style={[styles.v24hInnerCircle, { backgroundColor: theme.surfaceElevated }]}>
            <Text style={styles.v24hPlay}>▶</Text>
          </View>
        </LinearGradient>

        <View style={styles.v24hMetaWrap}>
          <Text style={styles.v24hName} numberOfLines={1}>
            {isOwnMessage ? 'You' : name}
          </Text>
          <Text style={styles.v24hTimer}>{formatCooldown(expiry.remainingMs)}</Text>
          {lockProfile && !isOwnMessage && (
            <BlurView intensity={30} style={styles.v24hBlurOverlay}>
              <Text style={styles.v24hLockedText}>Upgrade</Text>
            </BlurView>
          )}
        </View>
      </Pressable>
    );
  }, [currentUserId, isPremium, nowMs, theme.surfaceElevated]);

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headline}>Ask & Learn</Text>
          <Text style={styles.subtitle}>Get answers from real people</Text>
        </View>
        <View style={styles.limitBadge}>
          <Text style={styles.limitText}>
            {activeTab === '24h'
              ? (canPost24h ? 'Ready to post 24h video' : `Next in ${cooldownLabel}`)
              : `${Math.max(0, FREE_DAILY_LIMIT - questionsToday)}/${FREE_DAILY_LIMIT} left today`}
          </Text>
        </View>
      </View>

      {/* Segmented Control */}
      <BlurView intensity={22} tint={isDark ? 'dark' : 'light'} style={styles.segmentedOuter}>
        <Animated.View
          style={[
            styles.segmentedIndicator,
            {
              transform: [{
                translateX: tabIndicator.interpolate({
                  inputRange: [0, 1, 2],
                  outputRange: [0, (SCREEN_W - 48) / 3, ((SCREEN_W - 48) / 3) * 2],
                }),
              }],
            },
          ]}
        />
        <Pressable
          style={styles.segmentedTab}
          onPress={() => setActiveTab('public')}
        >
          <View style={styles.segmentedLabelRow}>
            <PublicGlobeSproutIcon
              size={14}
              color={activeTab === 'public' ? '#111827' : '#9CA3AF'}
              focused={activeTab === 'public'}
            />
            <Text style={[styles.segmentedLabel, activeTab === 'public' && styles.segmentedLabelActive]}>
              Public
            </Text>
          </View>
          <Text style={[styles.segmentedCount, activeTab === 'public' && styles.segmentedCountActive]}>
            {publicQuestions.length}
          </Text>
        </Pressable>
        <Pressable
          style={styles.segmentedTab}
          onPress={() => setActiveTab('private')}
        >
          <View style={styles.segmentedLabelRow}>
            <PrivateLockSproutIcon
              size={14}
              color={activeTab === 'private' ? '#111827' : '#9CA3AF'}
              focused={activeTab === 'private'}
            />
            <Text style={[styles.segmentedLabel, activeTab === 'private' && styles.segmentedLabelActive]}>
              Private
            </Text>
          </View>
          <Text style={[styles.segmentedCount, activeTab === 'private' && styles.segmentedCountActive]}>
            {privateQuestions.length}
          </Text>
        </Pressable>
        <Pressable
          style={styles.segmentedTab}
          onPress={() => setActiveTab('24h')}
        >
          <View style={styles.segmentedLabelRow}>
            <VideoBubblePlayIcon
              size={14}
              color={activeTab === '24h' ? '#111827' : '#9CA3AF'}
              focused={activeTab === '24h'}
            />
            <Text style={[styles.segmentedLabel, activeTab === '24h' && styles.segmentedLabelActive]}>
              24h
            </Text>
          </View>
          <Text style={[styles.segmentedCount, activeTab === '24h' && styles.segmentedCountActive]}>
            {v24hMessages.length}
          </Text>
        </Pressable>
      </BlurView>

      {/* Tab Description */}
      <Text style={styles.tabDesc}>
        {activeTab === 'public'
          ? 'Questions visible to the entire Cleexe community'
          : activeTab === 'private'
            ? 'Questions shared only within your circles'
            : 'Video bubble wall · 30s clips · auto-delete in 24h'}
      </Text>

      {activeTab === '24h' && (
        <View style={styles.v24hBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.v24hBannerTitle}>Video Bubble Wall</Text>
            <Text style={styles.v24hBannerSub}>
              {isPremium
                ? 'Premium: 1 video/hour · full profiles · archive enabled'
                : 'Free: 1 video/10h · profiles masked · upgrade to unmask'}
            </Text>
          </View>
          {isPremium && (
            <Pressable
              onPress={() => setIncognitoMode((p) => !p)}
              style={[styles.incognitoBtn, incognitoMode && styles.incognitoBtnActive]}
            >
              <Text style={[styles.incognitoText, incognitoMode && styles.incognitoTextActive]}>
                {incognitoMode ? 'Incognito On' : 'Incognito Off'}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        {activeTab === 'public' ? (
          <PublicGlobeSproutIcon size={38} color="#6B4EFF" focused />
        ) : activeTab === 'private' ? (
          <PrivateLockSproutIcon size={38} color="#6B4EFF" focused />
        ) : (
          <VideoBubblePlayIcon size={38} color="#6B4EFF" focused />
        )}
      </View>
      <Text style={styles.emptyTitle}>
        {activeTab === 'public'
          ? 'No public questions yet'
          : activeTab === 'private'
            ? 'No private questions yet'
            : 'No 24h videos yet'}
      </Text>
      <Text style={styles.emptySub}>Be the first to ask something!</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      {activeTab === '24h' ? (
        <FlatList
          key="ask-24h-grid"
          data={currentData}
          keyExtractor={extractItemKey}
          renderItem={render24hBubble}
          numColumns={3}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={11}
          getItemLayout={(_, index) => {
            const rowIndex = Math.floor(index / 3);
            return { length: V24H_ROW_HEIGHT, offset: V24H_ROW_HEIGHT * rowIndex, index };
          }}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.v24hContent}
        />
      ) : (
        <FlatList
          key="ask-qa-list"
          data={currentData}
          keyExtractor={extractItemKey}
          renderItem={renderItem}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={11}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={activeTab === '24h' ? handlePost24hVideo : () => setModalVisible(true)}
      >
        <View style={styles.fabIconWrap}>
          {activeTab === '24h' ? (
            <VideoBubblePlayIcon size={16} color="#FFFFFF" focused />
          ) : (
            <AskButtonSeedIcon size={16} color="#FFFFFF" focused />
          )}
        </View>
        <Text style={styles.fabLabel}>{activeTab === '24h' ? 'Post 24h' : 'Ask'}</Text>
      </Pressable>

      {/* New Question Modal */}
      <NewQuestionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onPost={handlePostQuestion}
        circles={MY_CIRCLES}
        questionsRemaining={Math.max(0, FREE_DAILY_LIMIT - questionsToday)}
      />

      <Modal visible={!!selected24h} transparent animationType="fade" onRequestClose={() => setSelected24h(null)}>
        <View style={styles.previewOverlay}>
          <BlurView intensity={28} tint={isDark ? 'dark' : 'light'} style={[styles.previewCard, { backgroundColor: theme.glassBg, borderColor: theme.glassBorder }]}>
            {selected24h && (
              <>
                <LinearGradient colors={getExpiryMeta(selected24h.expires_at, nowMs).colors} style={styles.previewRing}>
                  <View style={styles.previewVideo}>
                    <Text style={styles.previewPlay}>▶</Text>
                  </View>
                </LinearGradient>
                <Text style={styles.previewName}>
                  {isPremium ? (selected24h.is_private ? 'Incognito' : selected24h.author) : 'Locked Profile'}
                </Text>
                <Text style={styles.previewTimer}>
                  Expires in {formatCooldown(getExpiryMeta(selected24h.expires_at, nowMs).remainingMs)}
                </Text>

                {!isPremium && (
                  <Text style={styles.upgradeHint}>
                    Upgrade to unmask the community and open profiles.
                  </Text>
                )}

                <ChromeButton label="Record Reply" onPress={() => Alert.alert('Reply', 'Reply recorder hook is ready for expo-camera integration.')} style={{ marginTop: 14 }} />
                {isPremium ? (
                  <Pressable style={styles.archiveBtn} onPress={() => Alert.alert('Saved', 'Added to your Personal Archive.')}>
                    <Text style={styles.archiveText}>Save to Personal Archive</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.archiveLocked}>Archive is a Premium feature</Text>
                )}
              </>
            )}

            <Pressable onPress={() => setSelected24h(null)} style={styles.previewClose}>
              <Text style={styles.previewCloseText}>Close</Text>
            </Pressable>
          </BlurView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  listContent: { paddingBottom: 120 },

  /* Header */
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16 },
  headline: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  subtitle: { color: '#6B7280', fontSize: 14, marginTop: 3, fontWeight: '500' },
  limitBadge: { backgroundColor: '#F5F3FF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#E0DCFF' },
  limitText: { fontSize: 12, fontWeight: '700', color: '#6B4EFF' },

  /* Segmented Control */
  segmentedOuter: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 16, padding: 4, marginBottom: 12, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)' },
  segmentedIndicator: { position: 'absolute', top: 4, left: 4, width: (SCREEN_W - 48) / 3, height: '100%', backgroundColor: '#FFFFFF', borderRadius: 11, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  segmentedTab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 4, zIndex: 1 },
  segmentedLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  segmentedLabel: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  segmentedLabelActive: { color: '#111827', fontWeight: '700' },
  segmentedCount: { fontSize: 12, fontWeight: '700', color: '#D1D5DB', backgroundColor: '#E5E7EB', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1, overflow: 'hidden' },
  segmentedCountActive: { color: '#6B4EFF', backgroundColor: '#F5F3FF' },

  tabDesc: { fontSize: 12, color: '#9CA3AF', fontWeight: '500', paddingHorizontal: 20, marginBottom: 14 },
  v24hBanner: { marginHorizontal: 20, marginBottom: 12, padding: 12, borderRadius: 14, backgroundColor: '#F8F7FF', borderWidth: 1, borderColor: '#EBE7FF', flexDirection: 'row', alignItems: 'center', gap: 10 },
  v24hBannerTitle: { fontSize: 13, color: '#251D5C', fontWeight: '800' },
  v24hBannerSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  incognitoBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#DDD6FE', backgroundColor: '#FFFFFF' },
  incognitoBtnActive: { backgroundColor: '#6B4EFF', borderColor: '#6B4EFF' },
  incognitoText: { fontSize: 11, fontWeight: '700', color: '#6B4EFF' },
  incognitoTextActive: { color: '#FFFFFF' },

  /* Question Card */
  separator: { height: 12 },
  qCardPress: { paddingHorizontal: 20, paddingVertical: 2 },
  qCardPressed: { transform: [{ scale: 0.985 }] },
  qCardShell: { borderRadius: 28 },
  qCardBlur: { borderRadius: 28, borderWidth: 1, padding: 18, overflow: 'hidden' },

  qAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  qAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  qAvatarText: { fontSize: 24 },
  qAuthorName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  qMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  qTimeAgo: { fontSize: 12, color: '#9CA3AF' },
  qCircleBadge: { backgroundColor: '#F5F3FF', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  qCircleBadgeText: { fontSize: 10, fontWeight: '700', color: '#6B4EFF' },

  qVideoBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF2F2', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  qVideoIcon: { fontSize: 12 },
  qVideoLabel: { fontSize: 11, fontWeight: '700', color: '#DC2626' },

  qQuestionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  qText: { flex: 1, fontSize: 24, fontWeight: '700', color: '#1F2937', lineHeight: 34, letterSpacing: -0.3 },

  qVideoThumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 14,
  },
  qVideoCircleMask: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(107,78,255,0.3)',
    borderWidth: 2,
    borderColor: '#6B4EFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qVideoPlayIcon: { color: '#FFFFFF', fontSize: 16, marginLeft: 2 },
  qVideoPlayLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  qReplyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  qReplyCountWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qReplyCount: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  qBestBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  qBestBadgeText: { fontSize: 10, fontWeight: '700', color: '#059669' },

  qBestCard: { backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 16, padding: 14, marginTop: 10, borderWidth: 1, borderColor: '#D1FAE5' },
  qBestText: { fontSize: 13, fontWeight: '500', color: '#1F2937', lineHeight: 19 },

  /* Vibe Bar */
  vibeBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(148,163,184,0.15)' },
  vibePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F9FAFB', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#F0F0F5' },
  vibePillActive: { backgroundColor: '#F5F3FF', borderColor: '#E0DCFF' },
  vibePillPressed: { transform: [{ scale: 0.92 }] },
  vibeIconWrap: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  vibeCount: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  vibeCountActive: { color: '#6B4EFF' },

  /* Empty State */
  emptyState: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyIconWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  emptySub: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },

  /* FAB */
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6B4EFF',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabPressed: { opacity: 0.85, transform: [{ scale: 0.95 }] },
  fabIconWrap: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  fabLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  /* 24h Wall */
  v24hContent: { paddingBottom: 120, paddingHorizontal: 14 },
  v24hItem: { width: (SCREEN_W - 28) / 3, alignItems: 'center', marginBottom: 16 },
  v24hRing: { width: 96, height: 96, borderRadius: 48, padding: 2.5, alignItems: 'center', justifyContent: 'center' },
  v24hInnerCircle: { width: 86, height: 86, borderRadius: 43, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  v24hPlay: { color: '#FFFFFF', fontSize: 24, marginLeft: 4, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  v24hMetaWrap: { marginTop: 8, width: 90, borderRadius: 10, overflow: 'hidden', alignItems: 'center' },
  v24hName: { fontSize: 11, fontWeight: '700', color: '#1F2937' },
  v24hTimer: { fontSize: 10, color: '#9CA3AF', marginTop: 2, fontVariant: ['tabular-nums'] },
  v24hBlurOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  v24hLockedText: { fontSize: 10, color: '#111827', fontWeight: '700' },

  /* Expanded preview */
  previewOverlay: { flex: 1, backgroundColor: 'rgba(10,10,20,0.75)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  previewCard: { width: '100%', borderRadius: 24, padding: 22, alignItems: 'center', borderWidth: 1, overflow: 'hidden' },
  previewRing: { width: 220, height: 220, borderRadius: 110, padding: 5, alignItems: 'center', justifyContent: 'center' },
  previewVideo: { width: 210, height: 210, borderRadius: 105, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  previewPlay: { color: '#FFFFFF', fontSize: 52, marginLeft: 6 },
  previewName: { marginTop: 16, fontSize: 18, fontWeight: '800', color: '#111827' },
  previewTimer: { marginTop: 6, fontSize: 12, color: '#6B7280', fontVariant: ['tabular-nums'] },
  upgradeHint: { marginTop: 10, fontSize: 12, color: '#6B7280', textAlign: 'center' },
  archiveBtn: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: '#DDD6FE', backgroundColor: '#F5F3FF' },
  archiveText: { fontSize: 12, fontWeight: '700', color: '#6B4EFF' },
  archiveLocked: { marginTop: 12, fontSize: 11, color: '#9CA3AF' },
  previewClose: { marginTop: 16, paddingHorizontal: 16, paddingVertical: 8 },
  previewCloseText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
});

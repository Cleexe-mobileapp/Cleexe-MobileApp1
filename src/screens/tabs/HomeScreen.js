import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Flame,
  Heart,
  MessageCircle,
  Share2,
  Sparkles,
  Star,
} from 'lucide-react-native';

import { BRAND } from '../../theme/brand';
import { useTheme } from '../../theme/ThemeContext';
import { useGrowthStore } from '../../store/growthStore';

const FEED_ITEMS = [
  {
    id: 1,
    author: 'Cleexe',
    time: 'today',
    content:
      "Did you know? 96× — The average person checks their phone 96 times a day. You chose growth instead. That's rare.",
    badge: 'Insight',
    badgeColor: '#A78BFA',
  },
  {
    id: 2,
    author: 'Savage Mode',
    verified: true,
    time: 'today',
    content:
      'Stop admiring people on Instagram and actually DO what they do. Pick one person. Steal one trait. Go.',
    badge: 'Savage',
    badgeColor: BRAND.coral,
  },
  {
    id: 3,
    author: 'Alex R.',
    time: '10h',
    content:
      '3 months sober. No posts, no flexing. Just showed up every day when nobody was watching. This community kept me going.',
    badge: 'Win',
    badgeColor: BRAND.primaryAction,
  },
];

function FeedPostCard({ item, index, liked, onToggleLike, styles: S, theme }) {
  const heartScale = useSharedValue(1);
  const heartAnim = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const handleLike = useCallback(() => {
    heartScale.value = withSequence(
      withSpring(1.38, { damping: 11, stiffness: 200 }),
      withSpring(1, { damping: 15, stiffness: 140 })
    );
    onToggleLike(item.id);
  }, [heartScale, item.id, onToggleLike]);

  const muted = theme.textMuted;
  const likeColor = liked ? BRAND.coral : muted;

  return (
    <Animated.View
      entering={FadeInDown.delay(80 + index * 70)
        .springify()
        .damping(22)}
      style={S.feedCard}
    >
      <View style={S.feedCardInner}>
        <View style={S.feedTop}>
          <View style={S.feedAuthorBlock}>
            <Text style={S.feedGlyph}>✦</Text>
            <View>
              <View style={S.nameRow}>
                <Text style={S.feedAuthor}>{item.author}</Text>
                {item.verified ? (
                  <View style={S.starWrap}>
                    <Star size={16} color={theme.primary} />
                  </View>
                ) : null}
              </View>
              <Text style={S.feedTime}>{item.time}</Text>
            </View>
          </View>
          <View style={S.badgePill}>
            <Text style={[S.badgeText, { color: item.badgeColor }]}>{item.badge}</Text>
          </View>
        </View>
        <Text style={S.feedBody}>{item.content}</Text>
      </View>

      <View style={S.actionRow}>
        <Pressable
          onPress={handleLike}
          style={({ pressed }) => [S.actionBtn, pressed && S.actionBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Like"
        >
          <Animated.View style={[S.likeInner, heartAnim]}>
            <Heart size={23} color={likeColor} fill={liked ? BRAND.coral : 'transparent'} />
            <Text style={S.actionLabel}>Like</Text>
          </Animated.View>
        </Pressable>
        <Pressable style={S.actionBtn} accessibilityRole="button" accessibilityLabel="Comment">
          <MessageCircle size={23} color={muted} />
          <Text style={S.actionLabel}>Comment</Text>
        </Pressable>
        <Pressable style={S.actionBtn} accessibilityRole="button" accessibilityLabel="Share">
          <Share2 size={23} color={muted} />
          <Text style={S.actionLabel}>Share</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const { userProfile } = useGrowthStore();
  const [likedPosts, setLikedPosts] = useState({});

  const styles = useMemo(() => createHomeStyles(theme), [theme]);

  const toggleLike = useCallback((id) => {
    setLikedPosts((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const streak = userProfile?.streak ?? 0;
  const name = userProfile?.name ?? 'friend';

  const isLight = theme.tier === 'calm';
  const heroColors = isLight
    ? [theme.bgGradientStart, theme.bgGradientEnd]
    : [theme.bgGradientStart, theme.bgDeep, theme.bgGradientEnd];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={heroColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.greeting}>Good morning, {name}</Text>
          <View style={styles.streakRow}>
            <View style={styles.streakPill}>
              <Flame size={22} color={BRAND.coral} />
              <Text style={styles.streakNum}>{streak}-day streak</Text>
            </View>
            <Text style={styles.streakHint}>{"You're in rare territory"}</Text>
          </View>
        </LinearGradient>

        <View style={styles.sectionOverlap}>
          <View style={styles.dailyCard}>
            <View style={styles.dailyHeader}>
              <Text style={styles.dailyTitle}>Daily Reflection</Text>
              <Pressable style={styles.savagePill}>
                <Text style={styles.savagePillText}>Enable Savage Mode</Text>
              </Pressable>
            </View>
            <Text style={styles.dailyPrompt}>
              Who is someone you admire, and what quality of theirs can you practice today?
            </Text>
            <Pressable style={({ pressed }) => [styles.reflectBtn, pressed && styles.reflectBtnPressed]}>
              <LinearGradient
                colors={[theme.gradientCtaStart, theme.gradientCtaEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.reflectGradient}
              >
                <Text style={styles.reflectBtnText}>I Reflected</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.sectionLabel}>Your Future Self Replied</Text>
          <View style={styles.futureRow}>
            <View style={styles.futureCardBrown}>
              <Text style={styles.futureEmoji}>🤨</Text>
              <Text style={styles.futureTitleBrown}>SARCASTIC FUTURE YOU</Text>
              <Text style={styles.futureBodyBrown}>
                You reflected? Without someone forcing you? Character development is REAL.
              </Text>
              <Text style={styles.futureSigBrown}>— You, 2031</Text>
            </View>
            <LinearGradient
              colors={[BRAND.gradientSurfaceOrchidStart, BRAND.gradientSurfaceOrchidEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.futureCardOrchid}
            >
              <Text style={styles.futureEmoji}>🔥</Text>
              <Text style={styles.futureTitleOrchid}>HYPE BEAST FUTURE YOU</Text>
              <Text style={styles.futureBodyOrchid}>
                {"The main character energy I've seen today is unmatched."}
              </Text>
              <Text style={styles.futureSigOrchid}>— You, 2031</Text>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.block}>
          <View style={styles.forYouHeader}>
            <Text style={styles.forYouTitle}>For You</Text>
            <View style={styles.vibesPill}>
              <Sparkles size={18} color={theme.primary} />
              <Text style={styles.vibesText}>Positive vibes only</Text>
            </View>
          </View>

          {FEED_ITEMS.map((item, index) => (
            <FeedPostCard
              key={item.id}
              item={item}
              index={index}
              liked={!!likedPosts[item.id]}
              onToggleLike={toggleLike}
              styles={styles}
              theme={theme}
            />
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createHomeStyles(t) {
  const light = t.tier === 'calm';

  const textMain = light ? t.textHeading : t.textPrimary;
  const textSub = t.textSecondary;
  const textSoft = light ? t.textSecondary : BRAND.bodyOnDark;
  const surface = t.surfaceSolid;
  const border = t.cardBorder;
  const utility = t.textUtility;

  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bgDeep },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 40 },

    hero: {
      paddingHorizontal: 24,
      paddingTop: 48,
      paddingBottom: 56,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
    },
    greeting: {
      color: textMain,
      fontSize: 34,
      fontWeight: '700',
      letterSpacing: -0.8,
    },
    streakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 14,
      flexWrap: 'wrap',
      gap: 12,
    },
    streakPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: light ? 'rgba(255, 107, 107, 0.12)' : 'rgba(255, 209, 102, 0.12)',
      borderWidth: 1,
      borderColor: light ? 'rgba(255, 107, 107, 0.35)' : 'rgba(255, 209, 102, 0.35)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      gap: 8,
    },
    streakNum: {
      color: utility,
      fontSize: 17,
      fontWeight: '700',
    },
    streakHint: { color: textSub, fontSize: 15, fontWeight: '500' },

    sectionOverlap: { marginTop: -28, paddingHorizontal: 24 },
    dailyCard: {
      backgroundColor: surface,
      borderRadius: 24,
      padding: 28,
      borderWidth: 1,
      borderColor: border,
      shadowColor: t.cardShadowColor,
      shadowOffset: t.cardShadowOffset,
      shadowOpacity: t.cardShadowOpacity,
      shadowRadius: t.cardShadowRadius,
      elevation: t.cardElevation,
    },
    dailyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 18,
      gap: 12,
    },
    dailyTitle: { color: textMain, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
    savagePill: {
      backgroundColor: 'rgba(255, 107, 107, 0.12)',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(255, 107, 107, 0.35)',
    },
    savagePillText: { color: BRAND.coral, fontSize: 13, fontWeight: '600' },
    dailyPrompt: {
      color: light ? t.textPrimary : textSoft,
      fontSize: 21,
      lineHeight: 30,
      fontWeight: '500',
    },
    reflectBtn: { marginTop: 22, borderRadius: 16, overflow: 'hidden' },
    reflectBtnPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
    reflectGradient: {
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
    },
    reflectBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },

    block: { marginTop: 28, paddingHorizontal: 24 },
    sectionLabel: {
      color: textMain,
      fontSize: 17,
      fontWeight: '700',
      marginBottom: 16,
      letterSpacing: -0.2,
    },
    futureRow: { flexDirection: 'row', gap: 12 },
    futureCardBrown: {
      flex: 1,
      backgroundColor: BRAND.futureWarmBg,
      borderRadius: 22,
      padding: 18,
      borderWidth: 1,
      borderColor: BRAND.futureWarmBorder,
    },
    futureTitleBrown: {
      color: BRAND.futureWarmTitle,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.6,
      marginTop: 8,
    },
    futureBodyBrown: {
      color: BRAND.futureWarmBody,
      fontSize: 14.5,
      lineHeight: 22,
      marginTop: 10,
      fontWeight: '500',
    },
    futureSigBrown: { color: '#D97706', fontSize: 11, marginTop: 14, fontWeight: '600' },

    futureCardOrchid: {
      flex: 1,
      borderRadius: 22,
      padding: 18,
      borderWidth: 1,
      borderColor: 'rgba(124,58,237,0.25)',
    },
    futureTitleOrchid: {
      color: BRAND.futureHypeTitle,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.6,
      marginTop: 8,
    },
    futureBodyOrchid: {
      color: BRAND.futureHypeBody,
      fontSize: 14.5,
      lineHeight: 22,
      marginTop: 10,
      fontWeight: '500',
    },
    futureSigOrchid: { color: BRAND.futureHypeSig, fontSize: 11, marginTop: 14, fontWeight: '600' },
    futureEmoji: { fontSize: 28 },

    forYouHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 18,
    },
    forYouTitle: { color: textMain, fontSize: 24, fontWeight: '700', letterSpacing: -0.4 },
    vibesPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.primaryMuted,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: BRAND.borderLavenderCrisp,
      gap: 6,
    },
    vibesText: { color: utility, fontSize: 13, fontWeight: '600' },

    feedCard: {
      backgroundColor: surface,
      borderRadius: 22,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: border,
      overflow: 'hidden',
      shadowColor: t.cardShadowColor,
      shadowOffset: t.cardShadowOffset,
      shadowOpacity: t.cardShadowOpacity,
      shadowRadius: t.cardShadowRadius,
      elevation: t.cardElevation,
    },
    feedCardInner: { padding: 24 },
    feedTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
      gap: 12,
    },
    feedAuthorBlock: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
    feedGlyph: { fontSize: 22, marginRight: 12, color: t.primary },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    starWrap: { marginLeft: 2 },
    feedAuthor: { color: textMain, fontSize: 18, fontWeight: '700' },
    feedTime: { color: t.textMuted, fontSize: 13, marginTop: 2 },
    badgePill: {
      backgroundColor: light ? 'rgba(107,78,255,0.06)' : 'rgba(255,255,255,0.06)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: border,
    },
    badgeText: { fontSize: 12, fontWeight: '700' },
    feedBody: {
      color: light ? t.textPrimary : textSoft,
      fontSize: 16.5,
      lineHeight: 26,
      fontWeight: '400',
    },

    actionRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: t.separator,
      paddingVertical: 12,
    },
    actionBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
    },
    actionBtnPressed: { opacity: 0.85 },
    likeInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    actionLabel: { color: t.textMuted, fontSize: 13, fontWeight: '600' },

    bottomSpacer: { height: 100 },
  });
}

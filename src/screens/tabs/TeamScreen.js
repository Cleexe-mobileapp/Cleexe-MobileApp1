import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { supabase } from '../../services/supabase';
import CircleVideoPreview from '../../components/CircleVideoPreview';
import VideoIntroRecorder from '../../components/VideoIntroRecorder';
import {
  FindPartnerBloomIcon,
  MatchRingLeafIcon,
  MessageSparkIcon,
  PrivateLockSproutIcon,
  PublicGlobeSproutIcon,
  ReplyLeafIcon,
  TeamConnectionIcon,
  UpgradeCrownVineIcon,
} from '../../components/icons/CleexeIcons';
import { useTheme } from '../../theme/ThemeContext';
import ChromeButton from '../../components/ui/ChromeButton';

const { width: SCREEN_W } = Dimensions.get('window');
const TAB_COUNT = 3;
const TAB_W = (SCREEN_W - 56) / TAB_COUNT;

const TABS = [
  { key: 'partner', label: 'Partner', desc: '1-on-1 deep accountability' },
  { key: 'squad', label: 'Squad', desc: 'Team up with dreamers' },
  { key: 'way', label: 'Way', desc: 'Global opportunities' },
];

const DUMMY_PARTNER_MATCH = {
  name: 'Alex R.', avatar: '🧑‍💻', focus: 'Business Growth', streak: 67,
  timezone: 'EST (UTC-5)', matchScore: 94,
  bio: 'Building a SaaS startup. Looking for someone to keep me accountable on shipping weekly.',
  goals: ['Launch MVP', 'Get 100 users', 'Morning routine'], videoUrl: 'dummy://alex-intro',
};

const PARTNER_QUEUE = [
  { name: 'Priya K.', avatar: '👩‍🔬', focus: 'Career Change', matchScore: 87, timezone: 'IST', videoUrl: 'dummy://priya-intro' },
  { name: 'Marcus J.', avatar: '🧑‍🎨', focus: 'Creative Goals', matchScore: 82, timezone: 'PST', videoUrl: null },
  { name: 'Nina L.', avatar: '👩‍🏫', focus: 'Side Hustle', matchScore: 79, timezone: 'CET', videoUrl: 'dummy://nina-intro' },
];

const DUMMY_SQUADS = [
  { id: 's1', name: '5AM Club', emoji: '🌅', members: 8, maxMembers: 8, focus: 'Morning routines', checkIn: 'Daily', joined: true },
  { id: 's2', name: 'Startup Grind', emoji: '🚀', members: 5, maxMembers: 12, focus: 'Building side projects', checkIn: 'Weekly', joined: false },
  { id: 's3', name: 'Readers Circle', emoji: '📚', members: 14, maxMembers: 20, focus: 'Read 1 book per month', checkIn: '2x per week', joined: false },
  { id: 's4', name: 'Fitness Accountability', emoji: '💪', members: 6, maxMembers: 8, focus: 'Workout 4x per week', checkIn: 'Daily', joined: true },
  { id: 's5', name: 'Mental Health Support', emoji: '🧠', members: 3, maxMembers: 10, focus: 'Daily mindfulness', checkIn: 'Daily', joined: false },
];

const DUMMY_WAY_LISTINGS = [
  { id: 'w1', user: 'Lars M.', avatar: '🇩🇪', city: 'Berlin', country: 'Germany', offering: 'Tech job referrals, visa advice, apartment hunting tips', tags: ['Tech', 'Visa', 'Housing'], helpful: 234, videoUrl: 'dummy://lars-intro' },
  { id: 'w2', user: 'Yuki T.', avatar: '🇯🇵', city: 'Tokyo', country: 'Japan', offering: 'Teaching English, cultural integration, language exchange', tags: ['Teaching', 'Culture', 'Language'], helpful: 189, videoUrl: 'dummy://yuki-intro' },
  { id: 'w3', user: 'Maria S.', avatar: '🇨🇦', city: 'Toronto', country: 'Canada', offering: 'PR application help, networking events, co-working spaces', tags: ['Immigration', 'Networking'], helpful: 312, videoUrl: null },
  { id: 'w4', user: 'Ahmed K.', avatar: '🇦🇪', city: 'Dubai', country: 'UAE', offering: 'Freelance visa, business contacts, lifestyle adjustment', tags: ['Business', 'Freelance', 'Visa'], helpful: 156, videoUrl: 'dummy://ahmed-intro' },
  { id: 'w5', user: 'Sophie L.', avatar: '🇳🇱', city: 'Amsterdam', country: 'Netherlands', offering: 'Startup ecosystem intro, housing market navigation', tags: ['Startup', 'Housing'], helpful: 98, videoUrl: null },
  { id: 'w6', user: 'Carlos R.', avatar: '🇵🇹', city: 'Lisbon', country: 'Portugal', offering: 'Digital nomad community, D7 visa experience', tags: ['Nomad', 'Visa', 'Community'], helpful: 267, videoUrl: 'dummy://carlos-intro' },
];

const WAY_REQUESTS = [
  { id: 'wr1', user: 'You', text: 'Looking for someone in London who can help with tech job hunting and settling in', target: 'London, UK', replies: 3 },
];

const PREFERENCE_OPTIONS = {
  focus: ['Business Growth', 'Career Change', 'Health & Fitness', 'Creative Goals', 'Side Hustle', 'Personal Development', 'Mental Health'],
  timezone: ['PST (UTC-8)', 'MST (UTC-7)', 'CST (UTC-6)', 'EST (UTC-5)', 'GMT (UTC+0)', 'CET (UTC+1)', 'IST (UTC+5:30)', 'JST (UTC+9)', 'AEST (UTC+10)'],
  checkIn: ['Daily', '2-3x per week', 'Weekly'],
};

function formatCount(n) { return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n); }

function headingColor(theme) {
  return theme.tier === 'calm' ? theme.textHeading : theme.textPrimary;
}

function TeamTabGlyph({ tabKey, color, focused }) {
  if (tabKey === 'partner') return <FindPartnerBloomIcon size={13} color={color} focused={focused} />;
  if (tabKey === 'squad') return <TeamConnectionIcon size={13} color={color} focused={focused} />;
  return <PublicGlobeSproutIcon size={13} color={color} focused={focused} />;
}

function FrostedPanel({ children, style, theme }) {
  return (
    <View style={[sty.fpOuter, { borderRadius: theme.cardRadius, shadowColor: theme.cardShadowColor, shadowOffset: theme.cardShadowOffset, shadowOpacity: theme.cardShadowOpacity, shadowRadius: theme.cardShadowRadius, elevation: theme.cardElevation }, style]}>
      {Platform.OS === 'android' && (
        <View style={[StyleSheet.absoluteFill, { borderRadius: theme.cardRadius, backgroundColor: theme.tier === 'calm' ? 'rgba(255,255,255,0.90)' : theme.cardBg }]} />
      )}
      <BlurView intensity={theme.glassBlurIntensity} tint={theme.glassBlurTint} style={[sty.fpBlur, { borderRadius: theme.cardRadius, borderColor: theme.cardBorder, backgroundColor: theme.glassBg }]}>
        <View style={sty.fpInner}>{children}</View>
      </BlurView>
    </View>
  );
}

// ─── Premium Gate ─────────────────────────────────────────────────────────────

function PremiumGate({ feature, onUpgrade, theme }) {
  return (
    <View style={sty.gateWrap}>
      <FrostedPanel theme={theme}>
        <View style={sty.gateCenter}>
          <UpgradeCrownVineIcon size={28} color={theme.accent} focused />
          <Text style={[sty.gateTitle, { color: theme.textPrimary }]}>Upgrade for Unlimited</Text>
          <Text style={[sty.gateDesc, { color: theme.textSecondary }]}>{feature}</Text>
          <Pressable style={({ pressed }) => [sty.gateBtn, { backgroundColor: theme.accent }, pressed && { opacity: 0.85 }]} onPress={onUpgrade}>
            <Text style={[sty.gateBtnText, { color: theme.textOnAccent }]}>Unlock Premium</Text>
          </Pressable>
          <Text style={[sty.gateHint, { color: theme.textMuted }]}>Free tier: limited access</Text>
        </View>
      </FrostedPanel>
    </View>
  );
}

// ─── Modals ──────────────────────────────────────────────────────────────────

function FindPartnerModal({ visible, onClose, isPremium, onRecordVideo, hasVideoIntro, theme }) {
  const [focus, setFocus] = useState('');
  const [tz, setTz] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const modalBg = theme.tier === 'calm' ? '#FFFFFF' : theme.bgDeep;
  const handleFind = () => { if (!focus) { Alert.alert('Select Focus'); return; } Alert.alert(isPremium ? 'Priority Matching' : 'Matching Started', isPremium ? 'Finding your ideal partner now.' : 'Matched within 24-48 hours.'); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={sty.modalOverlay}>
        <View style={[sty.modalSheet, { backgroundColor: modalBg }]}>
          <View style={[sty.modalHandle, { backgroundColor: theme.separator }]} />
          <Text style={[sty.modalTitle, { color: theme.textPrimary }]}>Find Your Partner</Text>
          <Text style={[sty.modalSub, { color: theme.textSecondary }]}>Set preferences for the perfect match</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={[sty.videoSection, { backgroundColor: theme.surface, borderColor: theme.separator }]}>
              <Text style={[sty.videoTitle, { color: theme.textPrimary }]}>Video Intro</Text>
              <Text style={[sty.videoDesc, { color: theme.textSecondary }]}>{hasVideoIntro ? 'Your intro is live!' : 'Record a 15-30s intro for 4x more matches'}</Text>
              <Pressable style={({ pressed }) => [sty.videoBtn, { backgroundColor: hasVideoIntro ? 'transparent' : theme.textPrimary, borderWidth: hasVideoIntro ? 1 : 0, borderColor: theme.textPrimary }, pressed && sty.pressed]} onPress={onRecordVideo}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: hasVideoIntro ? theme.textPrimary : theme.textOnPrimary }}>{hasVideoIntro ? 'Re-record' : 'Record Intro'}</Text>
              </Pressable>
            </View>
            {[{ label: 'Growth Focus', options: PREFERENCE_OPTIONS.focus, val: focus, set: setFocus },
              { label: 'Timezone', options: PREFERENCE_OPTIONS.timezone, val: tz, set: setTz },
              { label: 'Check-in', options: PREFERENCE_OPTIONS.checkIn, val: checkIn, set: setCheckIn }].map((g) => (
              <View key={g.label}>
                <Text style={[sty.formLabel, { color: theme.textMuted }]}>{g.label}</Text>
                <View style={sty.chipGrid}>{g.options.map((o) => (
                  <Pressable key={o} style={[sty.formChip, { backgroundColor: g.val === o ? theme.primaryMuted : theme.inputBg, borderColor: g.val === o ? theme.textPrimary : theme.inputBorder }]} onPress={() => g.set(o)}>
                    <Text style={[sty.formChipText, { color: g.val === o ? theme.textPrimary : theme.textSecondary }]}>{o}</Text>
                  </Pressable>
                ))}</View>
              </View>
            ))}
            <View style={sty.modalBtnRow}>
              <Pressable style={({ pressed }) => [sty.modalCancelBtn, { borderColor: theme.separator }, pressed && sty.pressed]} onPress={onClose}>
                <Text style={[sty.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>
              <ChromeButton label={isPremium ? 'Priority Match' : 'Find Match'} onPress={handleFind} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CreateSquadModal({ visible, onClose, onCreate, isPremium, theme }) {
  const [name, setName] = useState(''); const [focus, setFocus] = useState(''); const [checkIn, setCheckIn] = useState('');
  const maxSize = isPremium ? 20 : 8;
  const modalBg = theme.tier === 'calm' ? '#FFFFFF' : theme.bgDeep;
  const handleCreate = () => { if (name.trim().length < 3) { Alert.alert('Name too short'); return; } if (!focus) { Alert.alert('Select Focus'); return; } onCreate({ name: name.trim(), focus, checkIn: checkIn || 'Weekly', maxSize }); setName(''); setFocus(''); setCheckIn(''); };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={sty.modalOverlay}>
        <View style={[sty.modalSheet, { backgroundColor: modalBg }]}>
          <View style={[sty.modalHandle, { backgroundColor: theme.separator }]} />
          <Text style={[sty.modalTitle, { color: theme.textPrimary }]}>Create a Squad</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[sty.formLabel, { color: theme.textMuted }]}>Squad Name</Text>
            <TextInput style={[sty.formInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }]} placeholder="e.g. 5AM Builders" placeholderTextColor={theme.textMuted} value={name} onChangeText={setName} maxLength={40} />
            <Text style={[sty.formLabel, { color: theme.textMuted }]}>Focus Area</Text>
            <View style={sty.chipGrid}>{PREFERENCE_OPTIONS.focus.map((f) => (
              <Pressable key={f} style={[sty.formChip, { backgroundColor: focus === f ? theme.primaryMuted : theme.inputBg, borderColor: focus === f ? theme.textPrimary : theme.inputBorder }]} onPress={() => setFocus(f)}>
                <Text style={[sty.formChipText, { color: focus === f ? theme.textPrimary : theme.textSecondary }]}>{f}</Text>
              </Pressable>
            ))}</View>
            <View style={sty.modalBtnRow}>
              <Pressable style={({ pressed }) => [sty.modalCancelBtn, { borderColor: theme.separator }, pressed && sty.pressed]} onPress={onClose}><Text style={[sty.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text></Pressable>
              <ChromeButton label="Create Squad" onPress={handleCreate} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PostWayModal({ visible, onClose, onPost, theme }) {
  const [text, setText] = useState(''); const [target, setTarget] = useState('');
  const modalBg = theme.tier === 'calm' ? '#FFFFFF' : theme.bgDeep;
  const handlePost = () => { if (text.trim().length < 10) { Alert.alert('Too short'); return; } if (!target.trim()) { Alert.alert('Add location'); return; } onPost({ text: text.trim(), target: target.trim() }); setText(''); setTarget(''); };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={sty.modalOverlay}>
        <View style={[sty.modalSheet, { backgroundColor: modalBg }]}>
          <View style={[sty.modalHandle, { backgroundColor: theme.separator }]} />
          <Text style={[sty.modalTitle, { color: theme.textPrimary }]}>Post a Way Request</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[sty.formLabel, { color: theme.textMuted }]}>Target City / Country</Text>
            <TextInput style={[sty.formInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }]} placeholder="e.g. Toronto, Canada" placeholderTextColor={theme.textMuted} value={target} onChangeText={setTarget} />
            <Text style={[sty.formLabel, { color: theme.textMuted }]}>What help do you need?</Text>
            <TextInput style={[sty.formInput, { minHeight: 80, textAlignVertical: 'top', backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }]} placeholder="Describe your needs..." placeholderTextColor={theme.textMuted} multiline value={text} onChangeText={setText} maxLength={300} />
            <View style={sty.modalBtnRow}>
              <Pressable style={({ pressed }) => [sty.modalCancelBtn, { borderColor: theme.separator }, pressed && sty.pressed]} onPress={onClose}><Text style={[sty.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text></Pressable>
              <ChromeButton label="Post Request" onPress={handlePost} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Partner Tab ──────────────────────────────────────────────────────────────

function PartnerContent({ isPremium, onFindPartner, onUpgrade, theme }) {
  const p = DUMMY_PARTNER_MATCH;
  return (
    <View>
      <FrostedPanel theme={theme}>
        <View style={sty.partnerHeader}>
          {p.videoUrl ? <CircleVideoPreview size={52} videoUrl={p.videoUrl} name={p.name} isPremium={isPremium} /> : <View style={[sty.partnerAvatar, { backgroundColor: theme.surface }]}><Text style={{ fontSize: 28 }}>{p.avatar}</Text></View>}
          <View style={{ flex: 1 }}>
            <Text style={[sty.partnerName, { color: headingColor(theme) }]}>{p.name}</Text>
            <Text style={[sty.partnerFocus, { color: theme.textMuted }]}>{p.focus} · {p.timezone}</Text>
          </View>
          <View style={[sty.matchBadge, { backgroundColor: theme.primaryMuted }]}>
            <Text style={[sty.matchScore, { color: theme.textPrimary }]}>{p.matchScore}%</Text>
            <Text style={[sty.matchLabel, { color: theme.textMuted }]}>match</Text>
          </View>
        </View>
        <Text style={[sty.partnerBio, { color: theme.textSecondary }]}>{p.bio}</Text>
        <View style={sty.partnerGoals}>
          {p.goals.map((g) => <View key={g} style={[sty.goalChip, { backgroundColor: theme.primaryMuted }]}><Text style={[sty.goalChipText, { color: theme.textSecondary }]}>{g}</Text></View>)}
        </View>
        <View style={sty.partnerActions}>
          <View style={sty.streakRow}>
            <FindPartnerBloomIcon size={13} color={theme.textUtility} focused />
            <Text style={[sty.streakNum, { color: theme.textUtility }]}>{p.streak}</Text>
            <Text style={[sty.streakLabel, { color: theme.textUtility }]}>day streak</Text>
          </View>
          <ChromeButton label="Message" onPress={() => {}} leftIcon={<MessageSparkIcon size={13} color={theme.textOnPrimary} focused />} />
        </View>
      </FrostedPanel>

      <Text style={[sty.sectionTitle, { color: headingColor(theme) }]}>Suggested Partners</Text>
      {PARTNER_QUEUE.map((q, i) => (
        <View key={q.name} style={[sty.queueCard, { borderBottomColor: theme.separator }]}>
          {q.videoUrl ? <CircleVideoPreview size={40} videoUrl={q.videoUrl} name={q.name} isPremium={isPremium} /> : <View style={[sty.queueAvatar, { backgroundColor: theme.surface }]}><Text style={{ fontSize: 20 }}>{q.avatar}</Text></View>}
          <View style={{ flex: 1 }}>
            <Text style={[sty.queueName, { color: theme.textPrimary }]}>{q.name}</Text>
            <Text style={[sty.queueMeta, { color: theme.textMuted }]}>{q.focus} · {q.timezone}</Text>
          </View>
          <View style={[sty.queueScore, { backgroundColor: theme.primaryMuted }]}>
            <Text style={[sty.queueScoreText, { color: theme.textPrimary }]}>{q.matchScore}%</Text>
          </View>
          {!isPremium && i > 0 && <View style={sty.blurOverlay}><PrivateLockSproutIcon size={18} color={theme.textMuted} focused /></View>}
        </View>
      ))}

      <Pressable style={({ pressed }) => [sty.ctaBtn, { backgroundColor: theme.accent }, pressed && { opacity: 0.85 }]} onPress={onFindPartner}>
        <FindPartnerBloomIcon size={14} color={theme.textOnAccent} focused />
        <Text style={[sty.ctaBtnText, { color: theme.textOnAccent }]}>Find New Partner</Text>
      </Pressable>

      {!isPremium && <PremiumGate feature="Instant priority matching, unlimited partner switches, advanced compatibility filters" onUpgrade={onUpgrade} theme={theme} />}
    </View>
  );
}

// ─── Squad Tab ────────────────────────────────────────────────────────────────

function SquadContent({ isPremium, onCreateSquad, onUpgrade, theme }) {
  const [squads, setSquads] = useState(DUMMY_SQUADS);
  const handleJoin = (id) => setSquads((prev) => prev.map((s) => s.id === id ? { ...s, joined: !s.joined, members: s.joined ? s.members - 1 : s.members + 1 } : s));
  const joinedCount = squads.filter((s) => s.joined).length;
  const maxSquads = isPremium ? 999 : 2;
  const canJoinMore = joinedCount < maxSquads;

  return (
    <View>
      <Text style={[sty.sectionTitle, { color: headingColor(theme) }]}>My Squads ({joinedCount})</Text>
      {squads.filter((s) => s.joined).map((s) => (
        <FrostedPanel key={s.id} theme={theme} style={{ marginBottom: 12 }}>
          <View style={sty.squadRow}>
            <Text style={sty.squadEmoji}>{s.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[sty.squadName, { color: theme.textPrimary }]}>{s.name}</Text>
              <Text style={[sty.squadMeta, { color: theme.textMuted }]}>{s.members}/{s.maxMembers} · {s.checkIn}</Text>
            </View>
            <ChromeButton label="Open" onPress={() => Alert.alert(s.name, `${s.focus}\n\nComing soon!`)} style={{ paddingVertical: 7, paddingHorizontal: 14 }} textStyle={{ fontSize: 12 }} />
          </View>
        </FrostedPanel>
      ))}
      <Text style={[sty.sectionTitle, { color: headingColor(theme) }]}>Discover</Text>
      {squads.filter((s) => !s.joined).map((s) => (
        <FrostedPanel key={s.id} theme={theme} style={{ marginBottom: 12 }}>
          <View style={sty.squadRow}>
            <Text style={sty.squadEmoji}>{s.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[sty.squadName, { color: theme.textPrimary }]}>{s.name}</Text>
              <Text style={[sty.squadMeta, { color: theme.textMuted }]}>{s.members}/{s.maxMembers} · {s.focus}</Text>
            </View>
            <Pressable style={({ pressed }) => [sty.joinBtn, { borderColor: canJoinMore ? theme.textPrimary : theme.textMuted }, pressed && sty.pressed]} onPress={() => { if (!canJoinMore && !isPremium) { Alert.alert('Limit', `Free: max ${maxSquads} squads.`); return; } handleJoin(s.id); }}>
              <Text style={[sty.joinBtnText, { color: canJoinMore ? theme.textPrimary : theme.textMuted }]}>Join</Text>
            </Pressable>
          </View>
        </FrostedPanel>
      ))}
      <Pressable style={({ pressed }) => [sty.ctaBtn, { backgroundColor: theme.accent }, pressed && { opacity: 0.85 }]} onPress={onCreateSquad}>
        <TeamConnectionIcon size={14} color={theme.textOnAccent} focused />
        <Text style={[sty.ctaBtnText, { color: theme.textOnAccent }]}>Create New Squad</Text>
      </Pressable>
      {!isPremium && <PremiumGate feature="Unlimited squads, custom rules, voting system" onUpgrade={onUpgrade} theme={theme} />}
    </View>
  );
}

// ─── Way Tab ──────────────────────────────────────────────────────────────────

function WayContent({ isPremium, onPostRequest, onUpgrade, theme }) {
  const [helpful, setHelpful] = useState({});
  const markHelpful = (id) => setHelpful((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <View>
      {WAY_REQUESTS.length > 0 && (
        <>
          <Text style={[sty.sectionTitle, { color: headingColor(theme) }]}>My Requests</Text>
          {WAY_REQUESTS.map((r) => (
            <FrostedPanel key={r.id} theme={theme} style={{ marginBottom: 12 }}>
              <Text style={[sty.wayText, { color: theme.textPrimary }]}>{r.text}</Text>
              <View style={sty.wayMeta}>
                <Text style={[sty.wayTarget, { color: theme.textSecondary }]}>📍 {r.target}</Text>
                <View style={sty.wayReplies}><ReplyLeafIcon size={12} color={theme.accent} focused /><Text style={{ fontSize: 12, fontWeight: '600', color: theme.accent }}>{r.replies} replies</Text></View>
              </View>
            </FrostedPanel>
          ))}
        </>
      )}
      <Text style={[sty.sectionTitle, { color: headingColor(theme) }]}>People Offering Help</Text>
      {DUMMY_WAY_LISTINGS.map((w, i) => (
        <FrostedPanel key={w.id} theme={theme} style={{ marginBottom: 12 }}>
          <View style={sty.wayHeader}>
            {w.videoUrl ? <CircleVideoPreview size={44} videoUrl={w.videoUrl} name={w.user} isPremium={isPremium} /> : <View style={[sty.wayFlag, { backgroundColor: theme.surface }]}><Text style={{ fontSize: 24 }}>{w.avatar}</Text></View>}
            <View style={{ flex: 1 }}>
              <Text style={[sty.wayUser, { color: theme.textPrimary }]}>{w.user}</Text>
              <Text style={[sty.wayLoc, { color: theme.textMuted }]}>📍 {w.city}, {w.country}</Text>
            </View>
            <Pressable style={({ pressed }) => [sty.helpfulBtn, { backgroundColor: helpful[w.id] ? theme.accentMuted : theme.surface }, pressed && sty.pressed]} onPress={() => markHelpful(w.id)}>
              <Text style={{ fontSize: 13 }}>{helpful[w.id] ? '✅' : '👍'}</Text>
              <Text style={[sty.helpfulCount, { color: helpful[w.id] ? theme.accent : theme.textMuted }]}>{formatCount(w.helpful + (helpful[w.id] ? 1 : 0))}</Text>
            </Pressable>
          </View>
          <Text style={[sty.wayOffering, { color: theme.textSecondary }]}>{w.offering}</Text>
          <View style={sty.wayTags}>
            {w.tags.map((tag) => <View key={tag} style={[sty.wayTag, { backgroundColor: theme.primaryMuted }]}><Text style={[sty.wayTagText, { color: theme.textSecondary }]}>{tag}</Text></View>)}
          </View>
          {isPremium ? <ChromeButton label="Message" onPress={() => Alert.alert('DM', `Message ${w.user} coming soon!`)} leftIcon={<MessageSparkIcon size={13} color={theme.textOnPrimary} focused />} /> : i > 2 && <View style={[sty.blurOverlay, { borderRadius: 20 }]}><PrivateLockSproutIcon size={18} color={theme.textMuted} focused /></View>}
        </FrostedPanel>
      ))}
      <Pressable style={({ pressed }) => [sty.ctaBtn, { backgroundColor: theme.accent }, pressed && { opacity: 0.85 }]} onPress={onPostRequest}>
        <PublicGlobeSproutIcon size={14} color={theme.textOnAccent} focused />
        <Text style={[sty.ctaBtnText, { color: theme.textOnAccent }]}>Post a Request</Text>
      </Pressable>
      {!isPremium && <PremiumGate feature="Priority visibility, direct messaging, unlimited requests" onUpgrade={onUpgrade} theme={theme} />}
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TeamScreen() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('partner');
  const [isPremium, setIsPremium] = useState(false);
  const [findPartnerVisible, setFindPartnerVisible] = useState(false);
  const [createSquadVisible, setCreateSquadVisible] = useState(false);
  const [postWayVisible, setPostWayVisible] = useState(false);
  const [videoRecorderVisible, setVideoRecorderVisible] = useState(false);
  const [hasVideoIntro, setHasVideoIntro] = useState(false);
  const tabIndicator = useRef(new Animated.Value(0)).current;

  useEffect(() => { if (supabase) supabase.auth.getUser().then(({ data }) => { const meta = data?.user?.user_metadata; if (meta?.is_premium) setIsPremium(true); if (meta?.video_intro_url) setHasVideoIntro(true); }).catch(() => {}); }, []);
  useEffect(() => { Animated.spring(tabIndicator, { toValue: TABS.findIndex((t) => t.key === activeTab), useNativeDriver: true, tension: 300, friction: 30 }).start(); }, [activeTab, tabIndicator]);

  const handleUpgrade = () => Alert.alert('Cleexe Premium', 'Coming soon!');
  const handleCreateSquad = useCallback((squad) => { Alert.alert('Squad Created!', `"${squad.name}" is live.`); setCreateSquadVisible(false); }, []);
  const handlePostWay = useCallback((req) => { Alert.alert('Request Posted!', `Looking for help in ${req.target}.`); setPostWayVisible(false); }, []);
  const currentTabInfo = TABS.find((t) => t.key === activeTab);

  return (
    <SafeAreaView style={[sty.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[sty.fixedHeader, { borderBottomColor: theme.separator }]}>
        <View style={sty.headerRow}>
          <View>
            <Text style={[sty.headline, { color: headingColor(theme) }]}>Team</Text>
            <Text style={[sty.subtitle, { color: theme.textMuted }]}>{currentTabInfo?.desc}</Text>
          </View>
          {isPremium && <View style={[sty.proBadge, { borderColor: theme.accent }]}><Text style={[sty.proBadgeText, { color: theme.accent }]}>PRO</Text></View>}
        </View>
        <View style={[sty.segOuter, { backgroundColor: theme.surface }]}>
          <Animated.View style={[sty.segIndicator, { backgroundColor: theme.surfaceElevated }, { transform: [{ translateX: tabIndicator.interpolate({ inputRange: [0, 1, 2], outputRange: [0, TAB_W, TAB_W * 2] }) }] }]} />
          {TABS.map((tab) => (
            <Pressable key={tab.key} style={sty.segTab} onPress={() => setActiveTab(tab.key)}>
              <View style={sty.segLabelRow}>
                <TeamTabGlyph tabKey={tab.key} color={activeTab === tab.key ? theme.textPrimary : theme.textMuted} focused={activeTab === tab.key} />
                <Text style={[sty.segLabel, { color: activeTab === tab.key ? theme.textPrimary : theme.textMuted, fontWeight: activeTab === tab.key ? '600' : '400' }]}>{tab.label}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView style={sty.scroll} contentContainerStyle={sty.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'partner' && <PartnerContent theme={theme} isPremium={isPremium} onFindPartner={() => setFindPartnerVisible(true)} onUpgrade={handleUpgrade} />}
        {activeTab === 'squad' && <SquadContent theme={theme} isPremium={isPremium} onCreateSquad={() => setCreateSquadVisible(true)} onUpgrade={handleUpgrade} />}
        {activeTab === 'way' && <WayContent theme={theme} isPremium={isPremium} onPostRequest={() => setPostWayVisible(true)} onUpgrade={handleUpgrade} />}
      </ScrollView>

      <FindPartnerModal theme={theme} visible={findPartnerVisible} onClose={() => setFindPartnerVisible(false)} isPremium={isPremium} hasVideoIntro={hasVideoIntro} onRecordVideo={() => { setFindPartnerVisible(false); setTimeout(() => setVideoRecorderVisible(true), 350); }} />
      <CreateSquadModal theme={theme} visible={createSquadVisible} onClose={() => setCreateSquadVisible(false)} onCreate={handleCreateSquad} isPremium={isPremium} />
      <PostWayModal theme={theme} visible={postWayVisible} onClose={() => setPostWayVisible(false)} onPost={handlePostWay} />
      <VideoIntroRecorder visible={videoRecorderVisible} onClose={() => setVideoRecorderVisible(false)} isPremium={isPremium} onVideoSaved={() => setHasVideoIntro(true)} />
    </SafeAreaView>
  );
}

const sty = StyleSheet.create({
  safe: { flex: 1 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },

  fixedHeader: { paddingBottom: 6, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 28, paddingTop: 14, paddingBottom: 12 },
  headline: { fontSize: 28, fontWeight: '600', letterSpacing: -0.4 },
  subtitle: { fontSize: 13, fontWeight: '400', marginTop: 6 },
  proBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
  proBadgeText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6 },

  segOuter: { flexDirection: 'row', marginHorizontal: 28, borderRadius: 14, padding: 3, marginBottom: 8 },
  segIndicator: { position: 'absolute', top: 3, left: 3, width: TAB_W, height: '100%', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  segTab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, zIndex: 1 },
  segLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  segLabel: { fontSize: 13 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 28, paddingTop: 24, paddingBottom: 120 },
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8, marginBottom: 14, marginTop: 28, textTransform: 'uppercase' },

  partnerHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  partnerAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  partnerName: { fontSize: 17, fontWeight: '600' },
  partnerFocus: { fontSize: 12, fontWeight: '400', marginTop: 4 },
  matchBadge: { alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  matchScore: { fontSize: 22, fontWeight: '600' },
  matchLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  partnerBio: { fontSize: 14, fontWeight: '400', lineHeight: 22, marginBottom: 16 },
  partnerGoals: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  goalChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  goalChipText: { fontSize: 12, fontWeight: '500' },
  partnerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streakNum: { fontSize: 15, fontWeight: '600' },
  streakLabel: { fontSize: 12, fontWeight: '400' },

  queueCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderBottomWidth: 1, position: 'relative', overflow: 'hidden' },
  queueAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  queueName: { fontSize: 14, fontWeight: '600' },
  queueMeta: { fontSize: 12, fontWeight: '400', marginTop: 3 },
  queueScore: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  queueScoreText: { fontSize: 13, fontWeight: '600' },

  squadRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  squadEmoji: { fontSize: 28 },
  squadName: { fontSize: 15, fontWeight: '600' },
  squadMeta: { fontSize: 11, fontWeight: '400', marginTop: 4 },
  joinBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  joinBtnText: { fontSize: 12, fontWeight: '600' },

  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, paddingVertical: 15, borderRadius: 14 },
  ctaBtnText: { fontSize: 14, fontWeight: '600' },

  wayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  wayFlag: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  wayUser: { fontSize: 15, fontWeight: '600' },
  wayLoc: { fontSize: 12, fontWeight: '400', marginTop: 3 },
  wayOffering: { fontSize: 13, fontWeight: '400', lineHeight: 21, marginBottom: 14 },
  wayTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  wayTag: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  wayTagText: { fontSize: 11, fontWeight: '600' },
  helpfulBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  helpfulCount: { fontSize: 12, fontWeight: '600' },

  wayText: { fontSize: 14, fontWeight: '500', lineHeight: 22 },
  wayMeta: { flexDirection: 'row', gap: 14, marginTop: 12 },
  wayReplies: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  wayTarget: { fontSize: 12, fontWeight: '400' },

  blurOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(245,245,247,0.85)', alignItems: 'center', justifyContent: 'center' },

  gateWrap: { marginTop: 28 },
  gateCenter: { alignItems: 'center' },
  gateTitle: { fontSize: 18, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  gateDesc: { fontSize: 13, fontWeight: '400', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  gateBtn: { paddingVertical: 13, paddingHorizontal: 32, borderRadius: 14 },
  gateBtnText: { fontSize: 14, fontWeight: '600' },
  gateHint: { fontSize: 11, fontWeight: '400', marginTop: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.40)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40, maxHeight: '90%' },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 22, fontWeight: '600', marginBottom: 6 },
  modalSub: { fontSize: 13, fontWeight: '400', marginBottom: 24 },
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 28 },
  modalCancelBtn: { flex: 1, borderWidth: 1, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '500' },

  formLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 10, marginTop: 18, textTransform: 'uppercase' },
  formInput: { borderWidth: 1, borderRadius: 14, padding: 16, fontSize: 15, fontWeight: '400', marginBottom: 4 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  formChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1 },
  formChipText: { fontSize: 13, fontWeight: '500' },

  videoSection: { borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1 },
  videoTitle: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  videoDesc: { fontSize: 13, fontWeight: '400', lineHeight: 20, marginBottom: 16 },
  videoBtn: { borderRadius: 999, paddingVertical: 12, alignItems: 'center' },

  fpOuter: { overflow: 'hidden' },
  fpBlur: { overflow: 'hidden', borderWidth: 1 },
  fpInner: { padding: 22 },
});

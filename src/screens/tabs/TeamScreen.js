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
import { supabase } from '../../services/supabase';
import CircleVideoPreview from '../../components/CircleVideoPreview';
import VideoIntroRecorder from '../../components/VideoIntroRecorder';
import { useTheme } from '../../theme/ThemeContext';
import GlassCard from '../../components/ui/GlassCard';
import ChromeButton from '../../components/ui/ChromeButton';

const { width: SCREEN_W } = Dimensions.get('window');
const TAB_COUNT = 3;
const TAB_W = (SCREEN_W - 48) / TAB_COUNT;

const TABS = [
  { key: 'partner', label: '🤝 Partner', desc: '1-on-1 deep accountability' },
  { key: 'squad', label: '👥 Squad', desc: 'Team up with dreamers' },
  { key: 'way', label: '🌍 Way', desc: 'Global opportunities' },
];

// ─── Dummy Data ───────────────────────────────────────────────────────────────

const DUMMY_PARTNER_MATCH = {
  name: 'Alex R.',
  avatar: '🧑‍💻',
  focus: 'Business Growth',
  streak: 67,
  timezone: 'EST (UTC-5)',
  matchScore: 94,
  bio: 'Building a SaaS startup. Looking for someone to keep me accountable on shipping weekly.',
  goals: ['Launch MVP', 'Get 100 users', 'Morning routine'],
  videoUrl: 'dummy://alex-intro',
};

const PARTNER_QUEUE = [
  { name: 'Priya K.', avatar: '👩‍🔬', focus: 'Career Change', matchScore: 87, timezone: 'IST', videoUrl: 'dummy://priya-intro' },
  { name: 'Marcus J.', avatar: '🧑‍🎨', focus: 'Creative Goals', matchScore: 82, timezone: 'PST', videoUrl: null },
  { name: 'Nina L.', avatar: '👩‍🏫', focus: 'Side Hustle', matchScore: 79, timezone: 'CET', videoUrl: 'dummy://nina-intro' },
];

const DUMMY_SQUADS = [
  { id: 's1', name: '5AM Club', emoji: '🌅', members: 8, maxMembers: 8, focus: 'Morning routines', owner: 'Sarah K.', checkIn: 'Daily', active: true, joined: true },
  { id: 's2', name: 'Startup Grind', emoji: '🚀', members: 5, maxMembers: 12, focus: 'Building side projects', owner: 'Dev P.', checkIn: 'Weekly', active: true, joined: false },
  { id: 's3', name: 'Readers Circle', emoji: '📚', members: 14, maxMembers: 20, focus: 'Read 1 book per month', owner: 'James W.', checkIn: '2x per week', active: true, joined: false },
  { id: 's4', name: 'Fitness Accountability', emoji: '💪', members: 6, maxMembers: 8, focus: 'Workout 4x per week', owner: 'Aisha B.', checkIn: 'Daily', active: true, joined: true },
  { id: 's5', name: 'Mental Health Support', emoji: '🧠', members: 3, maxMembers: 10, focus: 'Daily mindfulness + check-ins', owner: 'Jordan T.', checkIn: 'Daily', active: true, joined: false },
];

const DUMMY_WAY_LISTINGS = [
  { id: 'w1', user: 'Lars M.', avatar: '🇩🇪', city: 'Berlin', country: 'Germany', offering: 'Tech job referrals, visa advice, apartment hunting tips', tags: ['Tech', 'Visa', 'Housing'], helpful: 234, videoUrl: 'dummy://lars-intro' },
  { id: 'w2', user: 'Yuki T.', avatar: '🇯🇵', city: 'Tokyo', country: 'Japan', offering: 'Teaching English jobs, cultural integration, language exchange', tags: ['Teaching', 'Culture', 'Language'], helpful: 189, videoUrl: 'dummy://yuki-intro' },
  { id: 'w3', user: 'Maria S.', avatar: '🇨🇦', city: 'Toronto', country: 'Canada', offering: 'PR application help, networking events, co-working spaces', tags: ['Immigration', 'Networking'], helpful: 312, videoUrl: null },
  { id: 'w4', user: 'Ahmed K.', avatar: '🇦🇪', city: 'Dubai', country: 'UAE', offering: 'Freelance visa setup, business contacts, lifestyle adjustment tips', tags: ['Business', 'Freelance', 'Visa'], helpful: 156, videoUrl: 'dummy://ahmed-intro' },
  { id: 'w5', user: 'Sophie L.', avatar: '🇳🇱', city: 'Amsterdam', country: 'Netherlands', offering: 'Startup ecosystem intro, cycling culture guide, housing market navigation', tags: ['Startup', 'Housing'], helpful: 98, videoUrl: null },
  { id: 'w6', user: 'Carlos R.', avatar: '🇵🇹', city: 'Lisbon', country: 'Portugal', offering: 'Digital nomad community, D7 visa experience, co-living spaces', tags: ['Nomad', 'Visa', 'Community'], helpful: 267, videoUrl: 'dummy://carlos-intro' },
];

const WAY_REQUESTS = [
  { id: 'wr1', user: 'You', text: 'Looking for someone in London who can help with tech job hunting and settling in', target: 'London, UK', replies: 3 },
];

const PREFERENCE_OPTIONS = {
  focus: ['Business Growth', 'Career Change', 'Health & Fitness', 'Creative Goals', 'Side Hustle', 'Personal Development', 'Mental Health'],
  timezone: ['PST (UTC-8)', 'MST (UTC-7)', 'CST (UTC-6)', 'EST (UTC-5)', 'GMT (UTC+0)', 'CET (UTC+1)', 'IST (UTC+5:30)', 'JST (UTC+9)', 'AEST (UTC+10)'],
  checkIn: ['Daily', '2-3x per week', 'Weekly'],
};

function formatCount(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

// ─── Premium Gate Overlay ─────────────────────────────────────────────────────

function PremiumGate({ feature, onUpgrade, theme }) {
  return (
    <View style={styles.gateOverlay}>
      <View style={[styles.gateCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
        <Text style={styles.gateEmoji}>🔒</Text>
        <Text style={[styles.gateTitle, { color: theme.textPrimary }]}>Upgrade for Unlimited</Text>
        <Text style={[styles.gateDesc, { color: theme.textSecondary }]}>{feature}</Text>
        <ChromeButton label="Unlock Premium" onPress={onUpgrade} />
        <Text style={[styles.gateHint, { color: theme.textMuted }]}>Free tier: limited access</Text>
      </View>
    </View>
  );
}

// ─── Find Partner Modal ───────────────────────────────────────────────────────

function FindPartnerModal({ visible, onClose, isPremium, onRecordVideo, hasVideoIntro, theme }) {
  const [focus, setFocus] = useState('');
  const [tz, setTz] = useState('');
  const [checkIn, setCheckIn] = useState('');

  const handleFind = () => {
    if (!focus) { Alert.alert('Select Focus', 'Pick your primary growth focus.'); return; }
    Alert.alert(
      isPremium ? '🚀 Priority Matching' : '🔍 Matching Started',
      isPremium
        ? "We're finding your ideal partner right now. You'll be matched within minutes!"
        : "You'll be matched within 24-48 hours. Upgrade for instant priority matching!",
    );
    onClose();
  };

  const modalSheetBg = theme.tier !== 'calm' ? theme.bgDeep : '#FFFFFF';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: modalSheetBg }]}>
          <View style={[styles.modalHandle, { backgroundColor: theme.cardBorder }]} />
          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>🤝 Find Your Partner</Text>
          <Text style={[styles.modalSub, { color: theme.textSecondary }]}>Set your preferences for the perfect accountability match</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Video Intro Section */}
            <View style={[styles.videoIntroSection, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              <View style={styles.videoIntroHeader}>
                <Text style={[styles.videoIntroTitle, { color: theme.textPrimary }]}>🎬 Video Intro</Text>
                {hasVideoIntro && <Text style={styles.videoIntroDone}>✅ Recorded</Text>}
              </View>
              <Text style={[styles.videoIntroDesc, { color: theme.textSecondary }]}>
                {hasVideoIntro
                  ? 'Your video intro is live! Matches can see the real you.'
                  : 'Record a 15-30s intro to get 4x more matches'}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  hasVideoIntro ? [styles.videoIntroRecordedBtn, { borderColor: theme.primary }] : [styles.videoIntroRecordBtn, { backgroundColor: theme.primary }],
                  pressed && styles.pressed,
                ]}
                onPress={onRecordVideo}
              >
                <Text style={[hasVideoIntro ? styles.videoIntroRecordedText : styles.videoIntroRecordText, { color: hasVideoIntro ? theme.primary : theme.textOnPrimary }]}>
                  {hasVideoIntro ? '🔄 Re-record' : '📹 Record Intro (15-30s)'}
                </Text>
              </Pressable>
              {isPremium && !hasVideoIntro && (
                <Text style={[styles.videoIntroPremiumHint, { color: theme.primary }]}>✦ PRO: Video required for priority matching</Text>
              )}
            </View>

            <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Growth Focus</Text>
            <View style={styles.chipGrid}>
              {PREFERENCE_OPTIONS.focus.map((f) => (
                <Pressable
                  key={f}
                  style={[styles.formChip, { backgroundColor: focus === f ? theme.surface : theme.inputBg, borderColor: focus === f ? theme.primary : theme.inputBorder }, focus === f && styles.formChipActive]}
                  onPress={() => setFocus(f)}
                >
                  <Text style={[styles.formChipText, focus === f && styles.formChipTextActive, { color: focus === f ? theme.primary : theme.textSecondary }]}>{f}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Preferred Timezone</Text>
            <View style={styles.chipGrid}>
              {PREFERENCE_OPTIONS.timezone.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.formChip, { backgroundColor: tz === t ? theme.surface : theme.inputBg, borderColor: tz === t ? theme.primary : theme.inputBorder }, tz === t && styles.formChipActive]}
                  onPress={() => setTz(t)}
                >
                  <Text style={[styles.formChipText, tz === t && styles.formChipTextActive, { color: tz === t ? theme.primary : theme.textSecondary }]}>{t}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Check-in Frequency</Text>
            <View style={styles.chipGrid}>
              {PREFERENCE_OPTIONS.checkIn.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.formChip, { backgroundColor: checkIn === c ? theme.surface : theme.inputBg, borderColor: checkIn === c ? theme.primary : theme.inputBorder }, checkIn === c && styles.formChipActive]}
                  onPress={() => setCheckIn(c)}
                >
                  <Text style={[styles.formChipText, checkIn === c && styles.formChipTextActive, { color: checkIn === c ? theme.primary : theme.textSecondary }]}>{c}</Text>
                </Pressable>
              ))}
            </View>

            {!isPremium && (
              <View style={styles.freeLimitBanner}>
                <Text style={styles.freeLimitText}>Free: 1 match per month · Basic matching</Text>
                <Text style={styles.freeLimitUpgrade}>Upgrade for instant priority matching + unlimited</Text>
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <Pressable style={({ pressed }) => [styles.modalCancelBtn, { borderColor: theme.cardBorder }, pressed && styles.pressed]} onPress={onClose}>
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>
              <ChromeButton
                label={isPremium ? '🚀 Priority Match' : '🔍 Find Match'}
                onPress={handleFind}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Create Squad Modal ───────────────────────────────────────────────────────

function CreateSquadModal({ visible, onClose, onCreate, isPremium, theme }) {
  const [name, setName] = useState('');
  const [focus, setFocus] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const maxSize = isPremium ? 20 : 8;

  const handleCreate = () => {
    if (name.trim().length < 3) { Alert.alert('Name too short', 'Give your squad a name (3+ chars).'); return; }
    if (!focus) { Alert.alert('Select Focus', 'Pick a focus area for your squad.'); return; }
    onCreate({ name: name.trim(), focus, checkIn: checkIn || 'Weekly', maxSize });
    setName('');
    setFocus('');
    setCheckIn('');
  };

  const modalSheetBg = theme.tier !== 'calm' ? theme.bgDeep : '#FFFFFF';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: modalSheetBg }]}>
          <View style={[styles.modalHandle, { backgroundColor: theme.cardBorder }]} />
          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>👥 Create a Squad</Text>
          <Text style={[styles.modalSub, { color: theme.textSecondary }]}>Build a team around shared goals</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Squad Name</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              placeholder="e.g. 5AM Builders"
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={40}
            />

            <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Focus Area</Text>
            <View style={styles.chipGrid}>
              {PREFERENCE_OPTIONS.focus.map((f) => (
                <Pressable key={f} style={[styles.formChip, { backgroundColor: focus === f ? theme.surface : theme.inputBg, borderColor: focus === f ? theme.primary : theme.inputBorder }, focus === f && styles.formChipActive]} onPress={() => setFocus(f)}>
                  <Text style={[styles.formChipText, focus === f && styles.formChipTextActive, { color: focus === f ? theme.primary : theme.textSecondary }]}>{f}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Check-in Frequency</Text>
            <View style={styles.chipGrid}>
              {PREFERENCE_OPTIONS.checkIn.map((c) => (
                <Pressable key={c} style={[styles.formChip, { backgroundColor: checkIn === c ? theme.surface : theme.inputBg, borderColor: checkIn === c ? theme.primary : theme.inputBorder }, checkIn === c && styles.formChipActive]} onPress={() => setCheckIn(c)}>
                  <Text style={[styles.formChipText, checkIn === c && styles.formChipTextActive, { color: checkIn === c ? theme.primary : theme.textSecondary }]}>{c}</Text>
                </Pressable>
              ))}
            </View>

            <View style={[styles.sizeBanner, { backgroundColor: theme.surface }]}>
              <Text style={[styles.sizeText, { color: theme.primary }]}>Max size: {maxSize} members</Text>
              {!isPremium && <Text style={[styles.sizeHint, { color: theme.textMuted }]}>Upgrade for squads up to 20</Text>}
            </View>

            <View style={styles.modalBtnRow}>
              <Pressable style={({ pressed }) => [styles.modalCancelBtn, { borderColor: theme.cardBorder }, pressed && styles.pressed]} onPress={onClose}>
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>
              <ChromeButton label="Create Squad" onPress={handleCreate} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Post Way Request Modal ───────────────────────────────────────────────────

function PostWayModal({ visible, onClose, onPost, isPremium, theme }) {
  const [text, setText] = useState('');
  const [target, setTarget] = useState('');

  const handlePost = () => {
    if (text.trim().length < 10) { Alert.alert('Too short', 'Describe what help you need (10+ chars).'); return; }
    if (!target.trim()) { Alert.alert('Add location', 'Which city/country are you looking for?'); return; }
    onPost({ text: text.trim(), target: target.trim() });
    setText('');
    setTarget('');
  };

  const modalSheetBg = theme.tier !== 'calm' ? theme.bgDeep : '#FFFFFF';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: modalSheetBg }]}>
          <View style={[styles.modalHandle, { backgroundColor: theme.cardBorder }]} />
          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>🌍 Post a Way Request</Text>
          <Text style={[styles.modalSub, { color: theme.textSecondary }]}>Find people who can help you in another country</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Target City / Country</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              placeholder="e.g. Toronto, Canada"
              placeholderTextColor={theme.textMuted}
              value={target}
              onChangeText={setTarget}
            />
            <Text style={[styles.formLabel, { color: theme.textSecondary }]}>What help do you need?</Text>
            <TextInput
              style={[styles.formInput, { minHeight: 80, textAlignVertical: 'top', backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              placeholder="e.g. Looking for tech job referrals and visa advice..."
              placeholderTextColor={theme.textMuted}
              multiline
              value={text}
              onChangeText={setText}
              maxLength={300}
            />
            <Text style={[styles.charCount, { color: theme.textMuted }]}>{text.length}/300</Text>

            {!isPremium && (
              <View style={styles.freeLimitBanner}>
                <Text style={styles.freeLimitText}>Free: view listings + 1 request per month</Text>
                <Text style={styles.freeLimitUpgrade}>Upgrade for priority visibility + direct messaging</Text>
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <Pressable style={({ pressed }) => [styles.modalCancelBtn, { borderColor: theme.cardBorder }, pressed && styles.pressed]} onPress={onClose}>
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>
              <ChromeButton label="Post Request" onPress={handlePost} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Partner Tab Content ──────────────────────────────────────────────────────

function PartnerContent({ isPremium, onFindPartner, onUpgrade, theme }) {
  const hasMatch = true;
  const p = DUMMY_PARTNER_MATCH;

  return (
    <View>
      {/* Current Match */}
      {hasMatch ? (
        <GlassCard>
          <View style={styles.partnerHeader}>
            {p.videoUrl ? (
              <CircleVideoPreview size={50} videoUrl={p.videoUrl} name={p.name} isPremium={isPremium} />
            ) : (
              <View style={[styles.partnerAvatar, { backgroundColor: theme.bg, borderColor: theme.primary }]}><Text style={{ fontSize: 28 }}>{p.avatar}</Text></View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.partnerName, { color: theme.textPrimary }]}>{p.name}</Text>
              <Text style={[styles.partnerFocus, { color: theme.textSecondary }]}>{p.focus} · {p.timezone}</Text>
            </View>
            <View style={[styles.matchBadge, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              <Text style={[styles.matchScore, { color: theme.primary }]}>{p.matchScore}%</Text>
              <Text style={[styles.matchLabel, { color: theme.textMuted }]}>match</Text>
            </View>
          </View>
          <Text style={[styles.partnerBio, { color: theme.textSecondary }]}>{p.bio}</Text>
          <View style={styles.partnerGoals}>
            {p.goals.map((g) => (
              <View key={g} style={[styles.goalChip, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}><Text style={[styles.goalChipText, { color: theme.primary }]}>{g}</Text></View>
            ))}
          </View>
          <View style={styles.partnerStats}>
            <View style={styles.partnerStat}>
              <Text style={[styles.partnerStatNum, { color: theme.textSecondary }]}>🔥 {p.streak}</Text>
              <Text style={[styles.partnerStatLabel, { color: theme.textMuted }]}>day streak</Text>
            </View>
            <ChromeButton label="💬 Message" onPress={() => {}} />
          </View>
        </GlassCard>
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <Text style={styles.emptyEmoji}>🤝</Text>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No partner yet</Text>
          <Text style={[styles.emptySub, { color: theme.textMuted }]}>Find your perfect accountability match</Text>
        </View>
      )}

      {/* Partner Queue */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Suggested Partners</Text>
      {PARTNER_QUEUE.map((q, i) => (
        <View key={q.name} style={[styles.queueCard, { borderBottomColor: theme.separator }]}>
          {q.videoUrl ? (
            <CircleVideoPreview size={38} videoUrl={q.videoUrl} name={q.name} isPremium={isPremium} />
          ) : (
            <View style={[styles.queueAvatar, { backgroundColor: theme.surface }]}><Text style={{ fontSize: 20 }}>{q.avatar}</Text></View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.queueName, { color: theme.textPrimary }]}>{q.name}</Text>
            <Text style={[styles.queueMeta, { color: theme.textMuted }]}>{q.focus} · {q.timezone}</Text>
          </View>
          <View style={[styles.queueScore, { backgroundColor: theme.surface }]}>
            <Text style={[styles.queueScoreText, { color: theme.primary }]}>{q.matchScore}%</Text>
          </View>
          {!isPremium && i > 0 && (
            <View style={styles.blurOverlay}>
              <Text style={styles.blurIcon}>🔒</Text>
            </View>
          )}
        </View>
      ))}

      {/* Find Button */}
      <View style={{ marginTop: 16 }}>
        <ChromeButton label="🤝 Find New Partner" onPress={onFindPartner} />
      </View>

      {!isPremium && (
        <PremiumGate
          feature="Instant priority matching, unlimited partner switches, and advanced compatibility filters"
          onUpgrade={onUpgrade}
          theme={theme}
        />
      )}
    </View>
  );
}

// ─── Squad Tab Content ────────────────────────────────────────────────────────

function SquadContent({ isPremium, onCreateSquad, onUpgrade, theme }) {
  const [squads, setSquads] = useState(DUMMY_SQUADS);

  const handleJoin = (id) => {
    setSquads((prev) => prev.map((s) =>
      s.id === id ? { ...s, joined: !s.joined, members: s.joined ? s.members - 1 : s.members + 1 } : s
    ));
  };

  const joinedCount = squads.filter((s) => s.joined).length;
  const maxSquads = isPremium ? 999 : 2;
  const canJoinMore = joinedCount < maxSquads;

  return (
    <View>
      {/* My Squads */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>My Squads ({joinedCount})</Text>
      {squads.filter((s) => s.joined).map((s) => (
        <View key={s.id} style={[styles.squadCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <Text style={styles.squadEmoji}>{s.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.squadName, { color: theme.textPrimary }]}>{s.name}</Text>
            <Text style={[styles.squadMeta, { color: theme.textMuted }]}>{s.members}/{s.maxMembers} members · {s.checkIn} check-ins</Text>
          </View>
          <ChromeButton label="Open" onPress={() => Alert.alert(s.name, `${s.focus}\n\nSquad detail screen coming soon!`)} style={{ paddingVertical: 7, paddingHorizontal: 14 }} textStyle={{ fontSize: 12 }} />
        </View>
      ))}

      {/* Discover Squads */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Discover Squads</Text>
      {squads.filter((s) => !s.joined).map((s, i) => (
        <View key={s.id} style={[styles.squadCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <Text style={styles.squadEmoji}>{s.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.squadName, { color: theme.textPrimary }]}>{s.name}</Text>
            <Text style={[styles.squadMeta, { color: theme.textMuted }]}>{s.members}/{s.maxMembers} · {s.focus}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              canJoinMore ? [styles.joinSquadBtn, { borderColor: theme.primary }] : [styles.joinSquadBtnDisabled, { borderColor: theme.textMuted }],
              pressed && styles.pressed,
            ]}
            onPress={() => {
              if (!canJoinMore && !isPremium) {
                Alert.alert('Squad Limit', `Free users can join up to ${maxSquads} squads. Upgrade for unlimited!`);
                return;
              }
              handleJoin(s.id);
            }}
          >
            <Text style={[canJoinMore ? styles.joinSquadText : styles.joinSquadTextDisabled, { color: canJoinMore ? theme.primary : theme.textMuted }]}>Join</Text>
          </Pressable>
          {!isPremium && !canJoinMore && (
            <View style={[styles.blurOverlay, { borderRadius: 14 }]}>
              <Text style={styles.blurIcon}>🔒</Text>
            </View>
          )}
        </View>
      ))}

      <View style={{ marginTop: 16 }}>
        <ChromeButton label="👥 Create New Squad" onPress={onCreateSquad} />
      </View>

      {!isPremium && (
        <PremiumGate
          feature="Unlimited squads (up to 20 members), custom rules, voting system, and priority placement"
          onUpgrade={onUpgrade}
          theme={theme}
        />
      )}
    </View>
  );
}

// ─── Way Tab Content ──────────────────────────────────────────────────────────

function WayContent({ isPremium, onPostRequest, onUpgrade, theme }) {
  const [helpful, setHelpful] = useState({});

  const markHelpful = (id) => {
    setHelpful((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <View>
      {/* My Requests */}
      {WAY_REQUESTS.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>My Requests</Text>
          {WAY_REQUESTS.map((r) => (
            <View key={r.id} style={[styles.wayRequestCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              <Text style={[styles.wayRequestText, { color: theme.textPrimary }]}>{r.text}</Text>
              <View style={styles.wayRequestMeta}>
                <Text style={[styles.wayRequestTarget, { color: theme.textSecondary }]}>📍 {r.target}</Text>
                <Text style={[styles.wayRequestReplies, { color: theme.primary }]}>💬 {r.replies} replies</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {/* Listings */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>People Offering Help</Text>
      {DUMMY_WAY_LISTINGS.map((w, i) => (
        <View key={w.id} style={[styles.wayCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <View style={styles.wayHeader}>
            {w.videoUrl ? (
              <CircleVideoPreview size={44} videoUrl={w.videoUrl} name={w.user} isPremium={isPremium} />
            ) : (
              <View style={[styles.wayFlag, { backgroundColor: theme.bg, borderColor: theme.cardBorder }]}><Text style={{ fontSize: 24 }}>{w.avatar}</Text></View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.wayUserName, { color: theme.textPrimary }]}>{w.user}</Text>
              <Text style={[styles.wayLocation, { color: theme.textSecondary }]}>📍 {w.city}, {w.country}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.helpfulBtn,
                { backgroundColor: theme.surface },
                helpful[w.id] && styles.helpfulBtnActive,
                pressed && styles.pressed,
              ]}
              onPress={() => markHelpful(w.id)}
            >
              <Text style={styles.helpfulIcon}>{helpful[w.id] ? '✅' : '👍'}</Text>
              <Text style={[styles.helpfulCount, helpful[w.id] && styles.helpfulCountActive, { color: helpful[w.id] ? undefined : theme.textMuted }]}>
                {formatCount(w.helpful + (helpful[w.id] ? 1 : 0))}
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.wayOffering, { color: theme.textSecondary }]}>{w.offering}</Text>
          <View style={styles.wayTags}>
            {w.tags.map((t) => (
              <View key={t} style={styles.wayTag}><Text style={styles.wayTagText}>{t}</Text></View>
            ))}
          </View>

          {isPremium ? (
            <ChromeButton label="💬 Message" onPress={() => Alert.alert('DM', `Direct message to ${w.user} coming soon!`)} />
          ) : (
            i > 2 && (
              <View style={[styles.blurOverlay, { borderRadius: 16 }]}>
                <Text style={styles.blurIcon}>🔒</Text>
              </View>
            )
          )}
        </View>
      ))}

      <View style={{ marginTop: 16 }}>
        <ChromeButton label="🌍 Post a Request" onPress={onPostRequest} />
      </View>

      {!isPremium && (
        <PremiumGate
          feature="Priority visibility, direct messaging, unlimited requests, and verified local contacts"
          onUpgrade={onUpgrade}
          theme={theme}
        />
      )}
    </View>
  );
}

// ─── Main TeamScreen ──────────────────────────────────────────────────────────

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

  useEffect(() => {
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        const meta = data?.user?.user_metadata;
        if (meta?.is_premium) setIsPremium(true);
        if (meta?.video_intro_url) setHasVideoIntro(true);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const idx = TABS.findIndex((t) => t.key === activeTab);
    Animated.spring(tabIndicator, {
      toValue: idx,
      useNativeDriver: true,
      tension: 300,
      friction: 30,
    }).start();
  }, [activeTab, tabIndicator]);

  const handleUpgrade = () => {
    Alert.alert('Cleexe Premium', 'Unlock unlimited growth circles, priority matching, and advanced features.\n\nComing soon!');
  };

  const handleCreateSquad = useCallback((squad) => {
    Alert.alert('Squad Created! 🎉', `"${squad.name}" is live. Share it with your community!`);
    setCreateSquadVisible(false);
  }, []);

  const handlePostWay = useCallback((req) => {
    Alert.alert('Request Posted! 🌍', `Looking for help in ${req.target}. People will start responding soon!`);
    setPostWayVisible(false);
  }, []);

  const currentTabInfo = TABS.find((t) => t.key === activeTab);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      {/* Fixed Header + Tabs */}
      <View style={[styles.fixedHeader, { borderBottomColor: theme.separator }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headline, { color: theme.textPrimary }]}>Growth Circles</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{currentTabInfo?.desc}</Text>
          </View>
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>✦ PRO</Text>
            </View>
          )}
        </View>

        {/* Segmented Control */}
        <View style={[styles.segOuter, { backgroundColor: theme.surface }]}>
          <Animated.View
            style={[
              styles.segIndicator,
              { backgroundColor: theme.surfaceElevated },
              {
                transform: [{
                  translateX: tabIndicator.interpolate({
                    inputRange: [0, 1, 2],
                    outputRange: [0, TAB_W, TAB_W * 2],
                  }),
                }],
              },
            ]}
          />
          {TABS.map((tab) => (
            <Pressable
              key={tab.key}
              style={styles.segTab}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.segLabel, activeTab === tab.key && styles.segLabelActive, { color: activeTab === tab.key ? theme.textPrimary : theme.textMuted }]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'partner' && (
          <PartnerContent
            theme={theme}
            isPremium={isPremium}
            onFindPartner={() => setFindPartnerVisible(true)}
            onUpgrade={handleUpgrade}
          />
        )}
        {activeTab === 'squad' && (
          <SquadContent
            theme={theme}
            isPremium={isPremium}
            onCreateSquad={() => setCreateSquadVisible(true)}
            onUpgrade={handleUpgrade}
          />
        )}
        {activeTab === 'way' && (
          <WayContent
            theme={theme}
            isPremium={isPremium}
            onPostRequest={() => setPostWayVisible(true)}
            onUpgrade={handleUpgrade}
          />
        )}
      </ScrollView>

      {/* Modals */}
      <FindPartnerModal
        theme={theme}
        visible={findPartnerVisible}
        onClose={() => setFindPartnerVisible(false)}
        isPremium={isPremium}
        hasVideoIntro={hasVideoIntro}
        onRecordVideo={() => {
          setFindPartnerVisible(false);
          setTimeout(() => setVideoRecorderVisible(true), 350);
        }}
      />
      <CreateSquadModal theme={theme} visible={createSquadVisible} onClose={() => setCreateSquadVisible(false)} onCreate={handleCreateSquad} isPremium={isPremium} />
      <PostWayModal theme={theme} visible={postWayVisible} onClose={() => setPostWayVisible(false)} onPost={handlePostWay} isPremium={isPremium} />
      <VideoIntroRecorder
        visible={videoRecorderVisible}
        onClose={() => setVideoRecorderVisible(false)}
        isPremium={isPremium}
        onVideoSaved={(url) => { setHasVideoIntro(true); }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },

  /* Fixed Header */
  fixedHeader: { paddingBottom: 4, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  headline: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  premiumBadge: { backgroundColor: '#FFFBEB', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#FDE68A' },
  premiumBadgeText: { fontSize: 11, fontWeight: '800', color: '#D97706' },

  /* Segmented Control */
  segOuter: { flexDirection: 'row', marginHorizontal: 20, borderRadius: 12, padding: 3, marginBottom: 8 },
  segIndicator: { position: 'absolute', top: 3, left: 3, width: TAB_W, height: '100%', borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  segTab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, zIndex: 1 },
  segLabel: { fontSize: 13, fontWeight: '600' },
  segLabelActive: { fontWeight: '700' },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10, marginTop: 20 },

  /* Partner Card */
  partnerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  partnerAvatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  partnerName: { fontSize: 17, fontWeight: '700' },
  partnerFocus: { fontSize: 12, marginTop: 2 },
  matchBadge: { alignItems: 'center', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  matchScore: { fontSize: 18, fontWeight: '900' },
  matchLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  partnerBio: { fontSize: 14, lineHeight: 21, marginBottom: 12 },
  partnerGoals: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  goalChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  goalChipText: { fontSize: 12, fontWeight: '600' },
  partnerStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  partnerStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  partnerStatNum: { fontSize: 14, fontWeight: '700' },
  partnerStatLabel: { fontSize: 12 },

  /* Queue */
  queueCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, position: 'relative', overflow: 'hidden' },
  queueAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  queueName: { fontSize: 14, fontWeight: '700' },
  queueMeta: { fontSize: 12, marginTop: 1 },
  queueScore: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  queueScoreText: { fontSize: 12, fontWeight: '700' },

  /* Squad Card */
  squadCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 24, padding: 16, marginBottom: 10, borderWidth: 1, position: 'relative', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 3 },
  squadEmoji: { fontSize: 26 },
  squadName: { fontSize: 14, fontWeight: '700' },
  squadMeta: { fontSize: 11, marginTop: 2 },
  joinSquadBtn: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  joinSquadText: { fontSize: 12, fontWeight: '700' },
  joinSquadBtnDisabled: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  joinSquadTextDisabled: { fontSize: 12, fontWeight: '700' },

  /* Way Card */
  wayCard: { borderRadius: 24, padding: 18, marginBottom: 12, borderWidth: 1, position: 'relative', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 3 },
  wayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  wayFlag: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  wayUserName: { fontSize: 15, fontWeight: '700' },
  wayLocation: { fontSize: 12, marginTop: 1 },
  wayOffering: { fontSize: 13, fontWeight: '500', lineHeight: 20, marginBottom: 10 },
  wayTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  wayTag: { backgroundColor: '#EFF6FF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  wayTagText: { fontSize: 11, fontWeight: '700', color: '#2563EB' },
  wayDmBtn: { borderRadius: 999, paddingVertical: 9, alignItems: 'center' },
  wayDmText: { fontSize: 13, fontWeight: '700' },
  helpfulBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  helpfulBtnActive: { backgroundColor: '#F0FDF4' },
  helpfulIcon: { fontSize: 14 },
  helpfulCount: { fontSize: 12, fontWeight: '700' },
  helpfulCountActive: { color: '#059669' },

  wayRequestCard: { borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1 },
  wayRequestText: { fontSize: 14, fontWeight: '600', lineHeight: 21 },
  wayRequestMeta: { flexDirection: 'row', gap: 12, marginTop: 8 },
  wayRequestTarget: { fontSize: 12, fontWeight: '500' },
  wayRequestReplies: { fontSize: 12, fontWeight: '600' },

  /* Premium Blur Overlay */
  blurOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  blurIcon: { fontSize: 20 },

  /* Premium Gate */
  gateOverlay: { marginTop: 20, marginBottom: 10 },
  gateCard: { borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1 },
  gateEmoji: { fontSize: 32, marginBottom: 8 },
  gateTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  gateDesc: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 16 },
  gateHint: { fontSize: 11, marginTop: 10 },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40, maxHeight: '90%' },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  modalSub: { fontSize: 13, marginBottom: 18 },
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancelBtn: { flex: 1, borderWidth: 1, borderRadius: 999, paddingVertical: 13, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600' },

  /* Form */
  formLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 15, marginBottom: 4 },
  charCount: { fontSize: 11, textAlign: 'right', marginBottom: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  formChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5 },
  formChipActive: {},
  formChipText: { fontSize: 13, fontWeight: '600' },
  formChipTextActive: {},

  freeLimitBanner: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginTop: 16 },
  freeLimitText: { fontSize: 12, fontWeight: '600', color: '#92400E' },
  freeLimitUpgrade: { fontSize: 11, color: '#B45309', marginTop: 4 },

  sizeBanner: { borderRadius: 12, padding: 12, marginTop: 14, alignItems: 'center' },
  sizeText: { fontSize: 13, fontWeight: '700' },
  sizeHint: { fontSize: 11, marginTop: 2 },

  /* Video Intro Section */
  videoIntroSection: { borderRadius: 16, padding: 16, marginBottom: 18, borderWidth: 1 },
  videoIntroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  videoIntroTitle: { fontSize: 15, fontWeight: '700' },
  videoIntroDone: { fontSize: 12, fontWeight: '600', color: '#059669' },
  videoIntroDesc: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  videoIntroRecordBtn: { borderRadius: 999, paddingVertical: 11, alignItems: 'center' },
  videoIntroRecordText: { fontSize: 14, fontWeight: '700' },
  videoIntroRecordedBtn: { borderRadius: 999, paddingVertical: 11, alignItems: 'center', borderWidth: 1.5 },
  videoIntroRecordedText: { fontSize: 14, fontWeight: '700' },
  videoIntroPremiumHint: { fontSize: 11, fontWeight: '600', marginTop: 8, textAlign: 'center' },
});

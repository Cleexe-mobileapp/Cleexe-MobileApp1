import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Rect, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { create } from 'zustand';

import { useAuthSession } from '../context/AuthSessionProvider';
import { setPersistedTabSegment } from '../lib/last-tab-storage';
import { supabase } from '../services/supabase';

type OnboardingAnswers = {
  vision5Years: string;
  whyGoalsMatter: string;
  biggestChallenge: string;
  focusAreas: string[];
  biggestGoal12Months: string;
  motivations: string[];
  stuckLevel: number;
  lifeChangingDefinition: string;
  progressBlockers: string[];
  motivatingPeople: string;
  accountabilityLevel: number;
  idealLifeShift: string;
};

type OnboardingStore = {
  answers: OnboardingAnswers;
  setAnswer: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void;
  toggleArrayValue: (key: keyof OnboardingAnswers, value: string) => void;
};

const TOTAL_STEPS = 12;
const TRACK_WIDTH = 280;

const initialAnswers: OnboardingAnswers = {
  vision5Years: '',
  whyGoalsMatter: '',
  biggestChallenge: '',
  focusAreas: [],
  biggestGoal12Months: '',
  motivations: [],
  stuckLevel: 3,
  lifeChangingDefinition: '',
  progressBlockers: [],
  motivatingPeople: '',
  accountabilityLevel: 3,
  idealLifeShift: '',
};

const useOnboardingStore = create<OnboardingStore>((set) => ({
  answers: initialAnswers,
  setAnswer: (key, value) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [key]: value,
      },
    })),
  toggleArrayValue: (key, value) =>
    set((state) => {
      const current = state.answers[key];
      if (!Array.isArray(current)) return state;
      const exists = current.includes(value);
      return {
        answers: {
          ...state.answers,
          [key]: exists ? current.filter((item) => item !== value) : [...current, value],
        },
      };
    }),
}));

type OptionItem = {
  title: string;
  subtitle?: string;
  icon: string;
};

const focusAreaOptions: OptionItem[] = [
  { title: 'Productivity', icon: 'prism' },
  { title: 'Mindfulness', icon: 'bloom' },
  { title: 'Fitness', icon: 'core' },
  { title: 'Networking', icon: 'mesh' },
  { title: 'Creativity', icon: 'spark' },
  { title: 'Education', icon: 'glyph' },
  { title: 'Finance', icon: 'orbit' },
  { title: 'Relationships', icon: 'bridge' },
];

const goalOptions: OptionItem[] = [
  { title: 'Career Growth', subtitle: 'Advance professionally and earn more', icon: 'prism' },
  { title: 'Health & Fitness', subtitle: 'Build strong energy and confidence', icon: 'core' },
  { title: 'Financial Freedom', subtitle: 'Create wealth and security', icon: 'orbit' },
  { title: 'Relationships', subtitle: 'Build deeper meaningful connections', icon: 'bridge' },
  { title: 'Creative Projects', subtitle: 'Bring bold ideas to life', icon: 'spark' },
  { title: 'Learning', subtitle: 'Master high-value new skills', icon: 'glyph' },
];

const motivationOptions: OptionItem[] = [
  { title: 'Achievement', icon: 'prism' },
  { title: 'Personal Growth', icon: 'bloom' },
  { title: 'Recognition', icon: 'mesh' },
  { title: 'Purpose', icon: 'bridge' },
  { title: 'Freedom', icon: 'orbit' },
  { title: 'Making Impact', icon: 'spark' },
];

const blockerOptions: OptionItem[] = [
  { title: 'Lack of time', icon: 'glyph' },
  { title: 'Low motivation', icon: 'bloom' },
  { title: 'No clear direction', icon: 'prism' },
  { title: 'No accountability', icon: 'mesh' },
  { title: 'Limited resources', icon: 'orbit' },
  { title: 'Fear of failure', icon: 'bridge' },
];

const peopleOptions: OptionItem[] = [
  { title: 'High Achievers', subtitle: 'Driven, focused, execution-minded', icon: 'prism' },
  { title: 'Supportive Friends', subtitle: 'Encouraging, empathic, positive', icon: 'bloom' },
  { title: 'Expert Mentors', subtitle: 'Experienced, strategic, practical', icon: 'glyph' },
];

const frequencyLabels = ['Never', 'Rarely', 'Sometimes', 'Often', 'Every day'];

function Sparkle3D() {
  const rotate = useSharedValue(0);
  React.useEffect(() => {
    rotate.value = withRepeat(withTiming(360, { duration: 2200, easing: Easing.linear }), -1, false);
  }, [rotate]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotate.value}deg` }, { rotateY: `${rotate.value / 6}deg` }],
  }));
  return (
    <Animated.View style={[styles.sparkleWrap, style]}>
      <Text style={styles.sparkleText}>✦</Text>
    </Animated.View>
  );
}

function LuxeIcon({ name, selected }: { name: string; selected?: boolean }) {
  const colors = selected
    ? ['#7A61FF', '#FFD166']
    : ['rgba(122,97,255,0.8)', 'rgba(180,165,255,0.9)'];
  return (
    <View style={styles.iconShell}>
      <Svg width={22} height={22} viewBox="0 0 22 22">
        <Defs>
          <SvgGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors[0]} />
            <Stop offset="1" stopColor={colors[1]} />
          </SvgGradient>
        </Defs>
        <Rect x={1.5} y={1.5} width={19} height={19} rx={6} fill="rgba(255,255,255,0.65)" />
        {name === 'prism' && <Path d="M6 15l5-8 5 8H6z" fill="url(#g)" />}
        {name === 'bloom' && (
          <>
            <Circle cx={11} cy={11} r={2.3} fill="url(#g)" />
            <Circle cx={7} cy={11} r={1.5} fill="url(#g)" />
            <Circle cx={15} cy={11} r={1.5} fill="url(#g)" />
            <Circle cx={11} cy={7} r={1.5} fill="url(#g)" />
            <Circle cx={11} cy={15} r={1.5} fill="url(#g)" />
          </>
        )}
        {name === 'core' && <Rect x={6} y={6} width={10} height={10} rx={3} fill="url(#g)" />}
        {name === 'mesh' && (
          <>
            <Path d="M6 7h10M6 11h10M6 15h10" stroke="url(#g)" strokeWidth={1.4} strokeLinecap="round" />
            <Path d="M7 6v10M11 6v10M15 6v10" stroke="url(#g)" strokeWidth={1.1} strokeLinecap="round" />
          </>
        )}
        {name === 'spark' && <Path d="M11 4l1.6 4.1L17 9.7l-4 1.8L11 16l-2-4.5L5 9.7l4.4-1.6L11 4z" fill="url(#g)" />}
        {name === 'glyph' && (
          <Path d="M6.5 7.5h9v2h-9zm0 5h6v2h-6zM13 12.5h2.5v2H13z" fill="url(#g)" />
        )}
        {name === 'orbit' && (
          <>
            <Circle cx={11} cy={11} r={2} fill="url(#g)" />
            <Path d="M4.5 11c0-3.6 2.9-6.5 6.5-6.5S17.5 7.4 17.5 11 14.6 17.5 11 17.5 4.5 14.6 4.5 11z" stroke="url(#g)" strokeWidth={1.2} />
          </>
        )}
        {name === 'bridge' && (
          <Path d="M6 14c2.2-3.3 7.8-3.3 10 0M7 12h8M8.2 10.2h5.6" stroke="url(#g)" strokeWidth={1.5} strokeLinecap="round" />
        )}
      </Svg>
    </View>
  );
}

function ProgressBar({ step }: { step: number }) {
  return (
    <View style={styles.progressContainer}>
      <Text style={styles.progressText}>{`Step ${step} of ${TOTAL_STEPS}`}</Text>
      <View style={styles.progressTrack}>
        <LinearGradient
          colors={['#6B4EFF', '#937DFF', '#6B4EFF']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.progressFill, { width: `${Math.max((step / TOTAL_STEPS) * 100, 5)}%` }]}
        />
      </View>
    </View>
  );
}

function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1100 },
      { scale: interpolate(press.value, [0, 1], [1, 0.965]) },
      { rotateX: `${interpolate(press.value, [0, 1], [0, 8])}deg` },
    ],
  }));
  return (
    <Animated.View style={[styles.primaryWrap, style]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => {
          press.value = withTiming(1, { duration: 120 });
          Haptics.selectionAsync();
        }}
        onPressOut={() => {
          press.value = withTiming(0, { duration: 150 });
        }}
        style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]}
      >
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{title}</Text>}
      </Pressable>
    </Animated.View>
  );
}

function LiquidInput({
  value,
  onChangeText,
  placeholder,
  multiline,
  minHeight = 60,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  minHeight?: number;
}) {
  const focus = useSharedValue(0);
  const box = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(focus.value, [0, 1], [1, 1.01]) }],
    borderColor: focus.value > 0.5 ? '#6B4EFF' : '#DFE2EE',
  }));
  const underline = useAnimatedStyle(() => ({
    width: `${interpolate(focus.value, [0, 1], [0, 100])}%`,
    opacity: interpolate(focus.value, [0, 1], [0.5, 1]),
  }));

  return (
    <Animated.View style={[styles.inputWrap, box, { minHeight }]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#B3B7CC"
        style={[styles.input, multiline && styles.inputArea]}
        multiline={multiline}
        onFocus={() => {
          focus.value = withTiming(1, { duration: 180 });
        }}
        onBlur={() => {
          focus.value = withTiming(0, { duration: 180 });
        }}
      />
      <Animated.View style={[styles.inputUnderline, underline]} />
    </Animated.View>
  );
}

function SelectChip({
  option,
  selected,
  onPress,
}: {
  option: OptionItem;
  selected: boolean;
  onPress: () => void;
}) {
  const lift = useSharedValue(selected ? 1 : 0);
  React.useEffect(() => {
    lift.value = withSpring(selected ? 1 : 0, { damping: 12, stiffness: 180 });
  }, [lift, selected]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { translateY: interpolate(lift.value, [0, 1], [0, -4]) },
      { rotateX: `${interpolate(lift.value, [0, 1], [0, 6])}deg` },
    ],
    shadowOpacity: interpolate(lift.value, [0, 1], [0.05, 0.22]),
    backgroundColor: selected ? 'rgba(107,78,255,0.1)' : '#FFFFFF',
    borderColor: selected ? '#6B4EFF' : '#E2E5F1',
  }));
  return (
    <Animated.View style={[styles.chipWrap, style]}>
      <Pressable onPress={onPress} style={styles.chipPress}>
        <LuxeIcon name={option.icon} selected={selected} />
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.title}</Text>
      </Pressable>
    </Animated.View>
  );
}

function OptionCard({
  option,
  selected,
  onPress,
}: {
  option: OptionItem;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.optionCard, selected && styles.optionCardSelected]}>
      <LuxeIcon name={option.icon} selected={selected} />
      <View style={styles.optionCopy}>
        <Text style={styles.optionTitle}>{option.title}</Text>
        {!!option.subtitle && <Text style={styles.optionSubtitle}>{option.subtitle}</Text>}
      </View>
    </Pressable>
  );
}

function FrequencyScale({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const step = TRACK_WIDTH / 4;
  const knobX = useSharedValue((value - 1) * step);
  const startX = useSharedValue(0);

  React.useEffect(() => {
    knobX.value = withSpring((value - 1) * step, { damping: 14, stiffness: 220 });
  }, [knobX, step, value]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = knobX.value;
    })
    .onUpdate((event) => {
      const next = Math.max(0, Math.min(TRACK_WIDTH, startX.value + event.translationX));
      knobX.value = next;
    })
    .onEnd(() => {
      const snapIndex = Math.round(knobX.value / step);
      const clampedIndex = Math.max(0, Math.min(4, snapIndex));
      knobX.value = withSpring(clampedIndex * step, { damping: 12, stiffness: 240 });
      runOnJS(onChange)(clampedIndex + 1);
      runOnJS(Haptics.selectionAsync)();
    });

  const knobStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: knobX.value - 15 },
      { perspective: 1000 },
      { rotateX: '8deg' },
      { scale: 1.02 },
    ],
  }));

  return (
    <View style={styles.scaleWrap}>
      <Text style={styles.scaleCurrent}>{frequencyLabels[value - 1]}</Text>
      <View style={[styles.scaleTrack, { width: TRACK_WIDTH }]}>
        {frequencyLabels.map((label, index) => (
          <Pressable
            key={label}
            onPress={() => {
              onChange(index + 1);
              Haptics.selectionAsync();
            }}
            style={[styles.scaleStep, { left: index * step - 8 }]}
          >
            <View style={[styles.scaleDot, value === index + 1 && styles.scaleDotActive]} />
          </Pressable>
        ))}
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.scaleKnob, knobStyle]}>
            <View style={styles.scaleKnobInner} />
          </Animated.View>
        </GestureDetector>
      </View>
      <View style={[styles.scaleLabels, { width: TRACK_WIDTH + 32 }]}>
        {frequencyLabels.map((label, index) => (
          <Text key={label} style={[styles.scaleLabel, value === index + 1 && styles.scaleLabelActive]}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function ChromeSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const step = TRACK_WIDTH / 4;
  const knobX = useSharedValue((value - 1) * step);
  const startX = useSharedValue(0);
  const glow = useSharedValue(0.24);

  React.useEffect(() => {
    knobX.value = withSpring((value - 1) * step, { damping: 14, stiffness: 220 });
  }, [knobX, step, value]);

  React.useEffect(() => {
    glow.value = withRepeat(
      withSequence(withTiming(0.42, { duration: 950 }), withTiming(0.22, { duration: 950 })),
      -1,
      true
    );
  }, [glow]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = knobX.value;
    })
    .onUpdate((event) => {
      const next = Math.max(0, Math.min(TRACK_WIDTH, startX.value + event.translationX));
      knobX.value = next;
    })
    .onEnd(() => {
      const snapIndex = Math.round(knobX.value / step);
      const clampedIndex = Math.max(0, Math.min(4, snapIndex));
      knobX.value = withSpring(clampedIndex * step, { damping: 12, stiffness: 260 });
      runOnJS(onChange)(clampedIndex + 1);
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    });

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: knobX.value - 16 }, { perspective: 980 }, { rotateX: '8deg' }],
    shadowOpacity: glow.value,
  }));

  return (
    <View style={styles.sliderWrap}>
      <Text style={styles.sliderValue}>{value}</Text>
      <View style={[styles.sliderTrack, { width: TRACK_WIDTH }]}>
        <LinearGradient
          colors={['#EEEAFD', '#E8EAF9']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.sliderKnob, knobStyle]}>
            <View style={styles.sliderKnobRing} />
          </Animated.View>
        </GestureDetector>
      </View>
      <View style={[styles.sliderLabels, { width: TRACK_WIDTH + 18 }]}>
        <Text style={styles.rangeLabel}>Not important</Text>
        <Text style={styles.rangeLabel}>Critical</Text>
      </View>
    </View>
  );
}

export default function OnboardingQuestions() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string; email?: string }>();
  const { refreshOnboarding } = useAuthSession();
  const { answers, setAnswer, toggleArrayValue } = useOnboardingStore();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [touchedSteps, setTouchedSteps] = useState<Set<number>>(new Set());
  const [showValidation, setShowValidation] = useState(false);

  const MIN_CHARS = 50;

  const markStepTouched = useCallback((stepNum: number) => {
    setTouchedSteps((prev) => {
      if (prev.has(stepNum)) return prev;
      const next = new Set(prev);
      next.add(stepNum);
      return next;
    });
  }, []);

  const currentTextLength = useMemo(() => {
    switch (step) {
      case 1: return answers.vision5Years.length;
      case 2: return answers.whyGoalsMatter.length;
      case 3: return answers.biggestChallenge.length;
      case 8: return answers.lifeChangingDefinition.length;
      case 12: return answers.idealLifeShift.length;
      default: return -1;
    }
  }, [step, answers]);

  const isTextStep = currentTextLength >= 0;

  const isStepValid = useMemo(() => {
    switch (step) {
      case 1: return answers.vision5Years.length >= MIN_CHARS;
      case 2: return answers.whyGoalsMatter.length >= MIN_CHARS;
      case 3: return answers.biggestChallenge.length >= MIN_CHARS;
      case 4: return answers.focusAreas.length >= 1;
      case 5: return answers.biggestGoal12Months.length > 0;
      case 6: return answers.motivations.length >= 1;
      case 7: return touchedSteps.has(7);
      case 8: return answers.lifeChangingDefinition.length >= MIN_CHARS;
      case 9: return answers.progressBlockers.length >= 1;
      case 10: return answers.motivatingPeople.length > 0;
      case 11: return touchedSteps.has(11);
      case 12: return answers.idealLifeShift.length >= MIN_CHARS;
      default: return true;
    }
  }, [step, answers, touchedSteps]);

  React.useEffect(() => {
    if (isStepValid) setShowValidation(false);
  }, [isStepValid]);

  const slideX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const goStep = (nextStep: number) => {
    if (nextStep < 1 || nextStep > TOTAL_STEPS) return;
    setStep(nextStep);
    setShowValidation(false);
    slideX.value = withSpring(0, { damping: 18, stiffness: 190 });
    opacity.value = withTiming(1, { duration: 180 });
  };

  const next = async () => {
    if (!isStepValid) {
      setShowValidation(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (step === TOTAL_STEPS) {
      await finishOnboarding();
      return;
    }
    Haptics.selectionAsync();
    slideX.value = withTiming(-20, { duration: 120 });
    opacity.value = withTiming(0.82, { duration: 120 }, (finished) => {
      if (finished) runOnJS(goStep)(step + 1);
    });
  };

  const back = () => {
    if (step <= 1) return;
    Haptics.selectionAsync();
    slideX.value = withTiming(20, { duration: 120 });
    opacity.value = withTiming(0.82, { duration: 120 }, (finished) => {
      if (finished) runOnJS(goStep)(step - 1);
    });
  };

  const finishOnboarding = async () => {
    setSaving(true);
    const emailParam = params.email != null && String(params.email).length > 0 ? String(params.email) : null;
    const authContext = emailParam
      ? { email: emailParam }
      : params.source
        ? { source: String(params.source) }
        : null;
    let userId: string | null = null;

    if (supabase) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (user) {
          userId = user.id;

          await supabase.auth.updateUser({ data: { onboarding_completed: true } })
            .then(({ error }) => { if (error) console.warn('metadata_save:', error.message); });

          await supabase.from('profiles').upsert(
            {
              id: user.id,
              onboarding_completed: true,
              onboarding_data: answers,
              onboarding_auth_context: authContext,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          ).then(({ error }) => { if (error) console.warn('profiles_save:', error.message); });

          await supabase.from('onboarding_answers').upsert(
            {
              user_id: user.id,
              ...answers,
              auth_context: authContext,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          ).then(({ error }) => { if (error) console.warn('answers_save:', error.message); });

          const proxyUrl = process.env.EXPO_PUBLIC_AI_PROXY_URL;
          if (proxyUrl) {
            try {
              const res = await fetch(`${proxyUrl.replace(/\/$/, '')}/generate-path`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, onboarding: answers, authContext }),
              });
              if (res.ok) await res.json();
            } catch { /* AI proxy optional */ }
          }
        }
      } catch (error) {
        console.warn('onboarding_remote_save:', error);
      }
    }

    try {
      const storageKey = userId ? `@cleexe_onboarding_${userId}` : '@cleexe_onboarding_completed';
      await AsyncStorage.setItem(storageKey, 'true');
      await AsyncStorage.setItem(`${storageKey}_answers`, JSON.stringify(answers));
    } catch { /* local save best-effort */ }

    setSaving(false);
    await refreshOnboarding();
    await setPersistedTabSegment('home');
    router.replace('/(tabs)/home');
  };

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
    opacity: opacity.value,
  }));

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      slideX.value = event.translationX * 0.16;
    })
    .onEnd((event) => {
      if (event.translationX < -90 && step < TOTAL_STEPS) {
        runOnJS(next)();
      } else if (event.translationX > 90 && step > 1) {
        runOnJS(back)();
      } else {
        slideX.value = withSpring(0, { damping: 18, stiffness: 200 });
      }
    });

  const stepContent = useMemo(() => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.stepTitle}>Where do you want to be in 5 years?</Text>
            <Text style={styles.stepSubtitle}>Your vision board starts here</Text>
            <LiquidInput
              value={answers.vision5Years}
              onChangeText={(v) => setAnswer('vision5Years', v)}
              placeholder="In 5 years, I see myself..."
              multiline
              minHeight={130}
            />
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.stepTitle}>Why is achieving your goals important to you?</Text>
            <Text style={styles.stepSubtitle}>Your purpose creates momentum</Text>
            <LiquidInput
              value={answers.whyGoalsMatter}
              onChangeText={(v) => setAnswer('whyGoalsMatter', v)}
              placeholder="Because..."
              multiline
              minHeight={120}
            />
          </>
        );
      case 3:
        return (
          <>
            <Text style={styles.stepTitle}>What&apos;s your biggest challenge right now?</Text>
            <Text style={styles.stepSubtitle}>We tailor your path from this</Text>
            <LiquidInput
              value={answers.biggestChallenge}
              onChangeText={(v) => setAnswer('biggestChallenge', v)}
              placeholder="Right now I am struggling with..."
              minHeight={64}
            />
          </>
        );
      case 4:
        return (
          <>
            <Text style={styles.stepTitle}>Which areas of life are you focused on?</Text>
            <Text style={styles.stepSubtitle}>Choose all that apply</Text>
            <View style={styles.chipGrid}>
              {focusAreaOptions.map((option) => (
                <SelectChip
                  key={option.title}
                  option={option}
                  selected={answers.focusAreas.includes(option.title)}
                  onPress={() => toggleArrayValue('focusAreas', option.title)}
                />
              ))}
            </View>
          </>
        );
      case 5:
        return (
          <>
            <Text style={styles.stepTitle}>What&apos;s your biggest goal for the next 12 months?</Text>
            <Text style={styles.stepSubtitle}>Choose one priority</Text>
            <View style={styles.optionList}>
              {goalOptions.map((option) => (
                <OptionCard
                  key={option.title}
                  option={option}
                  selected={answers.biggestGoal12Months === option.title}
                  onPress={() => setAnswer('biggestGoal12Months', option.title)}
                />
              ))}
            </View>
          </>
        );
      case 6:
        return (
          <>
            <Text style={styles.stepTitle}>What motivates you most?</Text>
            <Text style={styles.stepSubtitle}>Select every driver that fits</Text>
            <View style={styles.chipGrid}>
              {motivationOptions.map((option) => (
                <SelectChip
                  key={option.title}
                  option={option}
                  selected={answers.motivations.includes(option.title)}
                  onPress={() => toggleArrayValue('motivations', option.title)}
                />
              ))}
            </View>
          </>
        );
      case 7:
        return (
          <>
            <Text style={styles.stepTitle}>How often do you feel stuck pursuing your goals?</Text>
            <Text style={styles.stepSubtitle}>Choose the one that matches your current rhythm</Text>
            <FrequencyScale value={answers.stuckLevel} onChange={(v) => { setAnswer('stuckLevel', v); markStepTouched(7); }} />
          </>
        );
      case 8:
        return (
          <>
            <Text style={styles.stepTitle}>What would make Cleexe truly life-changing for you?</Text>
            <Text style={styles.stepSubtitle}>Help us build your perfect experience</Text>
            <LiquidInput
              value={answers.lifeChangingDefinition}
              onChangeText={(v) => setAnswer('lifeChangingDefinition', v)}
              placeholder="Cleexe would be perfect if it..."
              multiline
              minHeight={130}
            />
          </>
        );
      case 9:
        return (
          <>
            <Text style={styles.stepTitle}>What usually stops your progress?</Text>
            <Text style={styles.stepSubtitle}>Select all that apply</Text>
            <View style={styles.chipGrid}>
              {blockerOptions.map((option) => (
                <SelectChip
                  key={option.title}
                  option={option}
                  selected={answers.progressBlockers.includes(option.title)}
                  onPress={() => toggleArrayValue('progressBlockers', option.title)}
                />
              ))}
            </View>
          </>
        );
      case 10:
        return (
          <>
            <Text style={styles.stepTitle}>What type of people motivate you most?</Text>
            <Text style={styles.stepSubtitle}>Choose one community style</Text>
            <View style={styles.optionList}>
              {peopleOptions.map((option) => (
                <OptionCard
                  key={option.title}
                  option={option}
                  selected={answers.motivatingPeople === option.title}
                  onPress={() => setAnswer('motivatingPeople', option.title)}
                />
              ))}
            </View>
          </>
        );
      case 11:
        return (
          <>
            <Text style={styles.stepTitle}>How important is accountability for you?</Text>
            <Text style={styles.stepSubtitle}>Set your level</Text>
            <ChromeSlider value={answers.accountabilityLevel} onChange={(v) => { setAnswer('accountabilityLevel', v); markStepTouched(11); }} />
          </>
        );
      default:
        return (
          <>
            <Text style={styles.stepTitle}>If your life improved dramatically, what would change?</Text>
            <Text style={styles.stepSubtitle}>Paint the picture of your next chapter</Text>
            <LiquidInput
              value={answers.idealLifeShift}
              onChangeText={(v) => setAnswer('idealLifeShift', v)}
              placeholder="In my ideal life..."
              multiline
              minHeight={130}
            />
            <View style={styles.finishSparkle}>
              <Sparkle3D />
            </View>
          </>
        );
    }
  }, [answers, setAnswer, step, toggleArrayValue, markStepTouched]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#FFFFFF', '#F8F8FF', '#FFF8EC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowBottom]} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ProgressBar step={step} />
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.card, cardStyle]}>
            <BlurView intensity={20} tint="light" style={styles.cardBlur}>
              <ScrollView
                contentContainerStyle={styles.cardContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.honestyRow}>
                  <Text style={styles.honestySparkle}>✦</Text>
                  <Text style={styles.honestyText}>Be honest with us and with yourself</Text>
                </View>
                {stepContent}
                {isTextStep && currentTextLength < MIN_CHARS && (
                  <Text style={styles.charHelper}>
                    Please write at least {MIN_CHARS} characters ({currentTextLength}/{MIN_CHARS})
                  </Text>
                )}
                {showValidation && !isStepValid && !isTextStep && (
                  <Text style={styles.validationHint}>Please answer this question to continue</Text>
                )}
              </ScrollView>
            </BlurView>
          </Animated.View>
        </GestureDetector>

        <View style={styles.footer}>
          <PrimaryButton
            title={step === TOTAL_STEPS ? 'Finish & Generate My Path' : 'Continue'}
            onPress={next}
            loading={saving}
            disabled={saving || !isStepValid}
          />
          {step > 1 && !saving ? (
            <Pressable style={styles.backRow} onPress={back}>
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  glow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(107,78,255,0.12)',
  },
  glowTop: { top: 64, right: -28 },
  glowBottom: { top: 120, left: -48, backgroundColor: 'rgba(255,209,102,0.14)' },
  progressContainer: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 8 },
  progressText: { textAlign: 'center', color: '#9BA2BC', fontSize: 12, fontWeight: '600' },
  progressTrack: {
    marginTop: 10,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E9ECF8',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999 },
  card: {
    flex: 1,
    width: '92%',
    alignSelf: 'center',
    borderRadius: 22,
    overflow: 'hidden',
    marginTop: 6,
  },
  cardBlur: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(110,88,238,0.1)',
    borderRadius: 22,
  },
  cardContent: {
    paddingHorizontal: 14,
    paddingTop: 24,
    paddingBottom: 30,
    gap: 14,
  },
  stepTitle: {
    fontSize: 44,
    lineHeight: 50,
    textAlign: 'center',
    color: '#13172A',
    fontWeight: '700',
  },
  stepSubtitle: {
    textAlign: 'center',
    color: '#A2A7BD',
    fontSize: 12,
    marginBottom: 4,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: '#DFE2EE',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#181D2F',
    fontSize: 15,
  },
  inputArea: {
    minHeight: 130,
    textAlignVertical: 'top',
  },
  inputUnderline: {
    height: 2,
    backgroundColor: '#6B4EFF',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  chipWrap: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E5F1',
    shadowColor: '#1A1F37',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 9,
    backgroundColor: '#FFFFFF',
  },
  chipPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    color: '#5B6078',
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextSelected: { color: '#4D3DD9' },
  optionList: { gap: 10 },
  optionCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6E8F2',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionCardSelected: {
    borderColor: '#6B4EFF',
    backgroundColor: 'rgba(107,78,255,0.08)',
  },
  optionCopy: { flex: 1 },
  optionTitle: {
    color: '#1F2439',
    fontWeight: '700',
    fontSize: 14,
  },
  optionSubtitle: {
    color: '#8A90A8',
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
  },
  iconShell: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleWrap: { marginTop: 2, alignItems: 'center' },
  scaleCurrent: {
    color: '#4F40DF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  scaleTrack: {
    height: 22,
    borderRadius: 999,
    backgroundColor: '#ECEFFB',
    justifyContent: 'center',
  },
  scaleStep: {
    position: 'absolute',
    top: 3,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C9CEE5',
  },
  scaleDotActive: {
    backgroundColor: '#6B4EFF',
  },
  scaleKnob: {
    position: 'absolute',
    top: -5,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#6B4EFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleKnobInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  scaleLabels: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabel: {
    fontSize: 10,
    color: '#A0A7BF',
    width: 54,
    textAlign: 'center',
  },
  scaleLabelActive: {
    color: '#4D40DF',
    fontWeight: '700',
  },
  sliderWrap: {
    alignItems: 'center',
    marginTop: 2,
  },
  sliderValue: {
    fontSize: 50,
    fontWeight: '700',
    color: '#5B4DF0',
    marginBottom: 8,
  },
  sliderTrack: {
    height: 14,
    borderRadius: 999,
    overflow: 'visible',
    justifyContent: 'center',
  },
  sliderKnob: {
    position: 'absolute',
    top: -9,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6B4EFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 7 },
    shadowRadius: 11,
    elevation: 9,
  },
  sliderKnobRing: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#FFFFFF',
  },
  sliderLabels: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeLabel: {
    fontSize: 10,
    color: '#A0A6BC',
    fontWeight: '600',
  },
  finishSparkle: {
    alignItems: 'center',
    marginTop: 6,
  },
  sparkleWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.74)',
  },
  sparkleText: {
    color: '#FFD166',
    fontWeight: '800',
    fontSize: 17,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 10,
  },
  primaryWrap: {
    width: '100%',
  },
  primaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4E5BFF',
    shadowColor: '#4E5BFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 10,
  },
  primaryButtonDisabled: { opacity: 0.75 },
  primaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  backRow: {
    marginTop: 10,
    alignItems: 'center',
  },
  backText: {
    color: '#7F85A0',
    fontWeight: '600',
    fontSize: 13,
  },
  honestyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 2,
  },
  honestySparkle: {
    color: '#C4B5FD',
    fontSize: 12,
  },
  honestyText: {
    color: '#A8ADBF',
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '300',
  },
  charHelper: {
    color: '#EF4444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  validationHint: {
    color: '#EF4444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
});

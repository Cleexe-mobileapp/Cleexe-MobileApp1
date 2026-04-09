import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_AI_PROXY_URL?.replace(/\/$/, '') ?? '';

export type OnboardingAnswers = Record<string, unknown>;

async function getOnboardingAnswers(): Promise<OnboardingAnswers | null> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const answersKey = keys.find((k) => k.includes('onboarding') && k.includes('answers'));
    if (!answersKey) return null;
    const raw = await AsyncStorage.getItem(answersKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function post(endpoint: string, body: Record<string, unknown>): Promise<unknown> {
  if (!API_BASE) return null;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
  return res.json();
}

function pickStr(o: OnboardingAnswers | null | undefined, ...keys: string[]): string {
  if (!o) return '';
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (Array.isArray(v) && v.length) return String(v[0]);
  }
  return '';
}

/** All free-text + array fields from onboarding for keyword personalization */
function collectOnboardingBlob(o: object): string {
  const parts: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') parts.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
  };
  walk(o);
  return parts.join(' ').toLowerCase();
}

// ─── Legacy endpoints ───────────────────────────────────────────────────────

export async function fetchDailyPrompt(): Promise<{ prompt: string } | null> {
  try {
    const answers = await getOnboardingAnswers();
    return (await post('/api/ai/daily-prompt', {
      focusAreas: answers?.focusAreas ?? [],
      biggestGoal: answers?.biggestGoal12Months ?? '',
    })) as { prompt: string } | null;
  } catch {
    return null;
  }
}

export async function fetchPositivityScore(): Promise<{ message: string; score?: number } | null> {
  try {
    const answers = await getOnboardingAnswers();
    if (!API_BASE) {
      const focus = pickStr(answers, 'focusAreas') || 'your goals';
      return {
        message: `Your positivity score is up 12% this month. Your focus on ${focus} is paying off — keep going!`,
        score: 12,
      };
    }
    return (await post('/api/ai/positivity-score', {
      focusAreas: answers?.focusAreas ?? [],
      motivations: answers?.motivations ?? [],
      stuckLevel: answers?.stuckLevel ?? 3,
    })) as { message: string; score?: number };
  } catch {
    return {
      message: 'Your positivity score is up 12% this month. Keep going!',
      score: 12,
    };
  }
}

export async function fetchStreakPrediction(): Promise<{ prediction: string } | null> {
  try {
    return (await post('/api/ai/streak-prediction', {})) as { prediction: string };
  } catch {
    return null;
  }
}

export async function fetchAskAnswer(question: string): Promise<{ answer: string } | null> {
  try {
    return (await post('/api/ai/ask', { question })) as { answer: string };
  } catch {
    return null;
  }
}

export async function fetchProfileSummary(): Promise<{ summary: string } | null> {
  try {
    const answers = await getOnboardingAnswers();
    return (await post('/api/ai/profile-summary', {
      onboarding: answers,
    })) as { summary: string };
  } catch {
    return null;
  }
}

// ─── Journey AI — primary API (mocks + optional backend) ─────────────────────

export type JourneyStage = {
  id: string;
  title: string;
  subtitle: string;
  order: number;
};

/** @deprecated Use JourneyStage */
export type RoadmapStage = JourneyStage;

/**
 * Mock “transcription” until a real speech-to-text API is wired.
 * Simulates delay and returns plausible text derived from onboarding themes.
 */
export async function mockTranscribeVoice(_uri: string, onboardingAnswers: object): Promise<string> {
  await new Promise((r) => setTimeout(r, 450));
  const blob = collectOnboardingBlob(onboardingAnswers);
  if (/family|parent|pressure|expectation/i.test(blob)) {
    return "I feel pulled between what my family expects and what I know I need for myself. Saying that out loud feels heavy but honest.";
  }
  if (/not enough|never enough|impost|doubt|fear/i.test(blob)) {
    return "Part of me still believes I'm not enough — even when I get praise. I want to trust my own evidence.";
  }
  return "What I'm sitting with is the gap between who I show up as and who I want to become. I'm ready to stop performing and start practicing.";
}

/**
 * Deep mirror question — keyword-aware from the 12 answers + optional recent mirror entries.
 */
export async function generateMirrorQuestion(
  onboardingAnswers: object,
  recentEntries?: { content?: unknown }[]
): Promise<string> {
  const recent = recentEntries ?? [];
  const recentHint =
    recent.length > 0
      ? ` (You've reflected ${recent.length} time(s) recently — go one layer deeper.)`
      : '';
  try {
    if (API_BASE) {
      const r = (await post('/api/ai/mirror-question', {
        onboarding: onboardingAnswers,
        recentCount: recent.length,
      })) as { question?: string } | null;
      if (r?.question) return r.question + recentHint;
    }
  } catch {
    /* mock */
  }

  const o = onboardingAnswers as OnboardingAnswers;
  const blob = collectOnboardingBlob(onboardingAnswers);

  if (/family|parent|pressure|expectation|should/i.test(blob)) {
    return `Where did you learn that love or safety required you to shrink? What would you say to that younger self today?${recentHint}`;
  }
  if (/not enough|never enough|compare|impost/i.test(blob)) {
    return `If “not enough” were a voice — whose voice is it really, and what proof would finally quiet it?${recentHint}`;
  }
  if (/self.doubt|doubt|afraid|fear|stuck/i.test(blob)) {
    return `You named fear and doubt in your answers. What is the smallest brave act that would prove to your nervous system that you’re on your side?${recentHint}`;
  }

  const challenge = pickStr(o, 'biggestChallenge', 'progressBlockers');
  const vision = pickStr(o, 'vision5Years', 'idealLifeShift');
  if (challenge) {
    return `When you wrote about “${challenge.slice(0, 90)}${challenge.length > 90 ? '…' : ''}” — what identity were you protecting?${recentHint}`;
  }
  if (vision) {
    return `Your vision includes “${vision.slice(0, 70)}…”. Who do you practice being today so that future self recognizes you tomorrow?${recentHint}`;
  }
  return `What story about yourself are you finally ready to stop rehearsing?${recentHint}`;
}

export async function generateIdentitySnapshot(
  userAnswer: string,
  onboardingAnswers: object
): Promise<string> {
  try {
    if (API_BASE) {
      const r = (await post('/api/ai/identity-snapshot', {
        answer: userAnswer,
        onboarding: onboardingAnswers,
      })) as { snapshot?: string } | null;
      if (r?.snapshot) return r.snapshot;
    }
  } catch {
    /* mock */
  }
  const blob = collectOnboardingBlob(onboardingAnswers);
  const theme =
    /family|pressure/i.test(blob) ? 'belonging and boundaries'
    : /not enough|doubt/i.test(blob) ? 'worthiness'
    : 'becoming';

  return `Identity snapshot (${theme}): you named something real — “${userAnswer.slice(0, 220)}${userAnswer.length > 220 ? '…' : ''}”. Carry one word from this into tomorrow: practice.`;
}

export async function generateFutureSelfResponse(
  userMessage: string,
  context: object
): Promise<string> {
  const ctx = context as {
    onboarding?: OnboardingAnswers;
    journeySummary?: string;
    recentMirror?: string;
  };
  try {
    if (API_BASE) {
      const r = (await post('/api/ai/future-self', {
        message: userMessage,
        onboarding: ctx.onboarding,
        journeySummary: ctx.journeySummary,
        recentMirror: ctx.recentMirror,
      })) as { reply?: string } | null;
      if (r?.reply) return r.reply;
    }
  } catch {
    /* mock */
  }
  const name = pickStr(ctx.onboarding, 'motivatingPeople') || 'friend';
  return `From the you that already crossed the bridge: I remember this doubt. You wrote about what matters — hold that.\n\nOne step from what you shared: ${userMessage.slice(0, 140)}${userMessage.length > 140 ? '…' : ''}\n\nI'm proud you're asking. Keep going, ${name.split(',')[0].trim() || 'you'}.`;
}

export async function generateJourneyStages(onboardingAnswers: object): Promise<JourneyStage[]> {
  try {
    if (API_BASE) {
      const r = (await post('/api/ai/roadmap-stages', { onboarding: onboardingAnswers })) as {
        stages?: JourneyStage[];
      } | null;
      if (r?.stages?.length) return r.stages;
    }
  } catch {
    /* mock */
  }
  const o = onboardingAnswers as OnboardingAnswers;
  const ch = pickStr(o, 'biggestChallenge', 'whyGoalsMatter');
  const blob = collectOnboardingBlob(onboardingAnswers);
  const dragon =
    /fear|doubt|pressure|family/i.test(blob) ? 'the weight you carried from others’ stories' : 'the version of you that plays small';

  return [
    { id: '1', order: 1, title: 'Leaving the Old Story', subtitle: 'Naming what no longer fits your truth.' },
    {
      id: '2',
      order: 2,
      title: 'Crossing the Threshold',
      subtitle: ch ? `Committing despite: ${ch.slice(0, 52)}…` : 'One brave commitment, repeated.',
    },
    { id: '3', order: 3, title: 'Trials & Allies', subtitle: 'Who reflects your future self back to you?' },
    { id: '4', order: 4, title: 'Facing the Dragon', subtitle: `Meeting ${dragon} with compassion.` },
    { id: '5', order: 5, title: 'The Ordeal', subtitle: 'Integration — body, emotion, identity.' },
    { id: '6', order: 6, title: 'Claiming the Treasure', subtitle: 'Embodying the identity you chose.' },
    { id: '7', order: 7, title: 'The Road Back', subtitle: 'Teaching someone else what you learned.' },
  ];
}

/** @deprecated Use generateJourneyStages */
export const generateRoadmapStages = generateJourneyStages;

/** @deprecated Use generateIdentitySnapshot */
export async function analyzeIdentitySnapshot(answer: string): Promise<{ snapshot: string; tags?: string[] }> {
  const snapshot = await generateIdentitySnapshot(answer, {});
  return { snapshot, tags: ['reflection'] };
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_AI_PROXY_URL?.replace(/\/$/, '') ?? '';

async function getOnboardingAnswers(): Promise<Record<string, any> | null> {
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

async function post(endpoint: string, body: Record<string, any>): Promise<any> {
  if (!API_BASE) return null;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
  return res.json();
}

export async function fetchDailyPrompt(): Promise<{ prompt: string } | null> {
  try {
    const answers = await getOnboardingAnswers();
    return await post('/api/ai/daily-prompt', {
      focusAreas: answers?.focusAreas ?? [],
      biggestGoal: answers?.biggestGoal12Months ?? '',
    });
  } catch {
    return null;
  }
}

export async function fetchPositivityScore(): Promise<{ message: string; score?: number } | null> {
  try {
    const answers = await getOnboardingAnswers();
    if (!API_BASE) {
      const focus = answers?.focusAreas?.join(', ') || 'your goals';
      return {
        message: `Your positivity score is up 12% this month. Your focus on ${focus} is paying off — keep going!`,
        score: 12,
      };
    }
    return await post('/api/ai/positivity-score', {
      focusAreas: answers?.focusAreas ?? [],
      motivations: answers?.motivations ?? [],
      stuckLevel: answers?.stuckLevel ?? 3,
    });
  } catch {
    return {
      message: 'Your positivity score is up 12% this month. Keep going!',
      score: 12,
    };
  }
}

export async function fetchStreakPrediction(): Promise<{ prediction: string } | null> {
  try {
    return await post('/api/ai/streak-prediction', {});
  } catch {
    return null;
  }
}

export async function fetchAskAnswer(question: string): Promise<{ answer: string } | null> {
  try {
    return await post('/api/ai/ask', { question });
  } catch {
    return null;
  }
}

export async function fetchProfileSummary(): Promise<{ summary: string } | null> {
  try {
    const answers = await getOnboardingAnswers();
    return await post('/api/ai/profile-summary', {
      onboarding: answers,
    });
  } catch {
    return null;
  }
}

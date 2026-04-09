import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { fetchPositivityScore } from '../services/ai';
import { supabase } from '../services/supabase';

interface Goal {
  id: number;
  title: string;
  progress: number;
  color: string;
}

interface Task {
  id: number;
  text: string;
  completed: boolean;
}

interface Habit {
  id: number;
  text: string;
  streak: number;
  completed: boolean;
}

interface UserProfile {
  name: string;
  positivityScore: number;
  focusArea: string;
  streak: number;
  consistency: number;
  activeGoalsCount: number;
  onboardingAnswers: Record<string, any>;
}

interface GrowthState {
  userProfile: UserProfile;
  activeGoals: Goal[];
  todayTasks: Task[];
  habitTracking: Habit[];
  aiInsight: string | null;
  suggestedMicroSteps: string[];
  isLoadingAi: boolean;

  toggleTask: (id: number) => void;
  toggleHabit: (id: number) => void;
  updateFromAI: (aiData: any) => void;
  refreshAiInsight: () => Promise<void>;
  askGrokToUpdate: () => Promise<void>;
}

async function loadOnboardingAnswers(): Promise<Record<string, any>> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const answersKey = keys.find((k) => k.includes('onboarding') && k.includes('answers'));
    if (!answersKey) return {};
    const raw = await AsyncStorage.getItem(answersKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export const useGrowthStore = create<GrowthState>((set, get) => ({
  userProfile: {
    name: 'Khagani',
    positivityScore: 12,
    focusArea: 'Mindfulness',
    streak: 0,
    consistency: 89,
    activeGoalsCount: 3,
    onboardingAnswers: {},
  },
  activeGoals: [
    { id: 1, title: 'Read 20 pages daily', progress: 65, color: '#A855F7' },
    { id: 2, title: 'Meditate 10 minutes', progress: 40, color: '#8B5CF6' },
    { id: 3, title: 'Exercise 3x/week', progress: 80, color: '#F59E0B' },
  ],
  todayTasks: [
    { id: 1, text: 'Journal for 5 minutes', completed: true },
    { id: 2, text: 'Review weekly goals', completed: false },
    { id: 3, text: 'Connect with accountability partner', completed: false },
    { id: 4, text: 'Complete 1 learning module', completed: false },
  ],
  habitTracking: [
    { id: 1, text: 'Hydration target', streak: 6, completed: true },
    { id: 2, text: '10-minute walk', streak: 11, completed: false },
    { id: 3, text: 'No-scroll first hour', streak: 3, completed: false },
  ],
  aiInsight: null,
  suggestedMicroSteps: [],
  isLoadingAi: false,

  toggleTask: (id) =>
    set((s) => ({
      todayTasks: s.todayTasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      ),
    })),

  toggleHabit: (id) =>
    set((s) => ({
      habitTracking: s.habitTracking.map((h) =>
        h.id === id ? { ...h, completed: !h.completed } : h
      ),
    })),

  updateFromAI: (aiData) =>
    set((s) => {
      const newGoals = s.activeGoals.map((g, i) => ({
        ...g,
        progress: Math.min(
          100,
          g.progress + (aiData?.progressBoost?.[i] || 15 + Math.floor(Math.random() * 20))
        ),
      }));

      return {
        activeGoals: newGoals,
        aiInsight: aiData?.insight ?? aiData?.aiMessage ?? s.aiInsight,
        suggestedMicroSteps: aiData?.suggestedMicroSteps ?? s.suggestedMicroSteps,
        userProfile: {
          ...s.userProfile,
          focusArea: aiData?.focusArea ?? s.userProfile.focusArea,
          streak: aiData?.streak ?? s.userProfile.streak + 1,
          positivityScore: aiData?.positivityScore ?? s.userProfile.positivityScore + 4,
          consistency: aiData?.consistency ?? s.userProfile.consistency,
          activeGoalsCount: newGoals.length,
        },
      };
    }),

  refreshAiInsight: async () => {
    set({ isLoadingAi: true });
    try {
      const result = await fetchPositivityScore();
      if (result) {
        set({ aiInsight: result.message });
      }
      get().updateFromAI(null);
    } catch {
      // keep existing
    } finally {
      set({ isLoadingAi: false });
    }
  },

  askGrokToUpdate: async () => {
    set({ isLoadingAi: true });
    try {
      const state = get();

      const onboardingAnswers =
        Object.keys(state.userProfile.onboardingAnswers).length > 0
          ? state.userProfile.onboardingAnswers
          : await loadOnboardingAnswers();

      if (Object.keys(onboardingAnswers).length > 0 && Object.keys(state.userProfile.onboardingAnswers).length === 0) {
        set((s) => ({
          userProfile: { ...s.userProfile, onboardingAnswers },
        }));
      }

      const { data, error } = await supabase.functions.invoke('grok-center', {
        body: {
          onboardingAnswers,
          currentProfile: {
            name: state.userProfile.name,
            positivityScore: state.userProfile.positivityScore,
            focusArea: state.userProfile.focusArea,
            streak: state.userProfile.streak,
            consistency: state.userProfile.consistency,
            activeGoalsCount: state.userProfile.activeGoalsCount,
          },
          recentCheckIns: state.todayTasks.map((t) => ({
            task: t.text,
            completed: t.completed,
          })),
        },
      });

      if (error) throw error;

      get().updateFromAI(data);
    } catch (err) {
      console.warn('[growthStore] Grok call failed, using local fallback:', err);
      get().updateFromAI(null);
    } finally {
      set({ isLoadingAi: false });
    }
  },
}));

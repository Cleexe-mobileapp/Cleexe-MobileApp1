import { create } from 'zustand';

import type { OnboardingAnswers, JourneyStage } from '@/src/services/ai';
import {
  generateIdentitySnapshot,
  generateJourneyStages,
  generateMirrorQuestion,
  mockTranscribeVoice,
} from '@/src/services/ai';
import { supabase } from '@/src/services/supabase';

export type IdentitySnapshot = {
  id: string;
  text: string;
  createdAt: string;
};

export type SomaticEntry = {
  id: string;
  tension: number;
  energy: number;
  emotion: number;
  note?: string;
  createdAt: string;
};

export type JourneyEntryRow = {
  id: string;
  entry_type: string;
  stage: string | null;
  content: Record<string, unknown>;
  created_at: string;
};

function firstNameFromDisplay(displayName: string): string {
  const t = displayName.trim();
  if (!t) return 'there';
  return t.split(/\s+/)[0] ?? 'there';
}

type JourneyState = {
  hydrated: boolean;
  userId: string | null;
  onboardingAnswers: OnboardingAnswers | null;
  displayName: string;
  /** First token of display name for greetings */
  firstName: string;
  identitySnapshots: IdentitySnapshot[];
  somaticLogs: SomaticEntry[];
  journeyStages: JourneyStage[];
  /** Cached mythic progress keyed by stage id */
  mythicProgress: Record<string, { lastExcerpt: string; updatedAt: string }>;
  /** AI-generated mirror prompt */
  currentMirrorQuestion: string | null;
  mirrorLoading: boolean;
  /** Latest snapshot text shown in Identity Mirror after reveal */
  lastMirrorSnapshot: string | null;
  entries: JourneyEntryRow[];
  lastError: string | null;

  hydrate: (userId: string) => Promise<void>;
  refreshMirror: () => Promise<void>;
  submitMirrorAnswer: (text: string, audioUri?: string | null) => Promise<void>;
  logSomatic: (tension: number, energy: number, emotion: number, note?: string) => Promise<void>;
  saveMythicChapter: (stageId: string, text: string) => Promise<void>;
  markJourneyLaunchSeen: () => Promise<void>;
  runRecalibration: () => Promise<{ summary: string }>;
  clearError: () => void;
  clearLastMirrorSnapshot: () => void;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeSnapshots(raw: unknown): IdentitySnapshot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x: unknown, i: number) => {
      const o = x as { id?: string; text?: string; createdAt?: string };
      if (o && typeof o.text === 'string') {
        return {
          id: o.id ?? `snap-${i}`,
          text: o.text,
          createdAt: o.createdAt ?? new Date().toISOString(),
        };
      }
      return null;
    })
    .filter((x): x is IdentitySnapshot => x != null);
}

export const useJourneyStore = create<JourneyState>((set, get) => ({
  hydrated: false,
  userId: null,
  onboardingAnswers: null,
  displayName: '',
  firstName: 'there',
  identitySnapshots: [],
  somaticLogs: [],
  journeyStages: [],
  mythicProgress: {},
  currentMirrorQuestion: null,
  mirrorLoading: false,
  lastMirrorSnapshot: null,
  entries: [],
  lastError: null,

  clearError: () => set({ lastError: null }),
  clearLastMirrorSnapshot: () => set({ lastMirrorSnapshot: null }),

  hydrate: async (userId: string) => {
    set({ lastError: null });
    try {
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select(
          'display_name, onboarding_answers, journey_stages, identity_snapshots, somatic_logs'
        )
        .eq('id', userId)
        .maybeSingle();

      if (pErr) throw pErr;

      const oa = (profile?.onboarding_answers as OnboardingAnswers) ?? null;
      const idSnaps = normalizeSnapshots(profile?.identity_snapshots);
      const somatic = (profile?.somatic_logs as unknown as SomaticEntry[]) ?? [];
      let stages: JourneyStage[] = (profile?.journey_stages as unknown as JourneyStage[]) ?? [];
      if (!stages?.length && oa) {
        stages = await generateJourneyStages(oa);
        await supabase.from('profiles').update({ journey_stages: stages as unknown as object }).eq('id', userId);
      }

      const { data: je } = await supabase
        .from('journey_entries')
        .select('id, entry_type, stage, content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200);

      const mythic: Record<string, { lastExcerpt: string; updatedAt: string }> = {};
      (je ?? []).forEach((row) => {
        if (row.entry_type === 'mythic' && row.stage) {
          const excerpt = String((row.content as { text?: string })?.text ?? '').slice(0, 160);
          mythic[row.stage] = { lastExcerpt: excerpt, updatedAt: row.created_at };
        }
      });

      const dn = profile?.display_name ?? 'there';

      set({
        hydrated: true,
        userId,
        onboardingAnswers: oa,
        displayName: dn,
        firstName: firstNameFromDisplay(dn),
        identitySnapshots: Array.isArray(idSnaps) ? idSnaps : [],
        somaticLogs: Array.isArray(somatic) ? somatic : [],
        journeyStages: stages,
        mythicProgress: mythic,
        entries: (je ?? []) as JourneyEntryRow[],
      });

      await get().refreshMirror();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ lastError: msg, hydrated: true, userId });
    }
  },

  refreshMirror: async () => {
    const { onboardingAnswers, entries, currentMirrorQuestion } = get();
    const initialLoad = !currentMirrorQuestion;
    if (initialLoad) set({ mirrorLoading: true });
    try {
      const recentMirror = entries.filter((e) => e.entry_type === 'mirror').slice(0, 5);
      const q = await generateMirrorQuestion(onboardingAnswers ?? {}, recentMirror);
      set({ currentMirrorQuestion: q, mirrorLoading: false });
    } catch {
      if (initialLoad) set({ mirrorLoading: false });
    }
  },

  submitMirrorAnswer: async (text: string, audioUri?: string | null) => {
    const { userId, onboardingAnswers, identitySnapshots } = get();
    if (!userId) return;
    set({ mirrorLoading: true, lastError: null });
    try {
      let finalText = text;
      if (audioUri) {
        const transcribed = await mockTranscribeVoice(audioUri, onboardingAnswers ?? {});
        const base = text.trim() && text !== '(voice reflection)' ? `${text.trim()}\n\n` : '';
        finalText = `${base}${transcribed}`.trim();
      }

      const snapshotText = await generateIdentitySnapshot(finalText, onboardingAnswers ?? {});

      const snap: IdentitySnapshot = {
        id: uid(),
        text: snapshotText,
        createdAt: new Date().toISOString(),
      };
      const next = [snap, ...identitySnapshots].slice(0, 50);

      await supabase.from('journey_entries').insert({
        user_id: userId,
        entry_type: 'mirror',
        content: {
          answer: finalText,
          audioNote: audioUri ?? null,
          snapshot: snapshotText,
          tags: ['reflection'],
        },
      });

      await supabase
        .from('profiles')
        .update({ identity_snapshots: next as unknown as object })
        .eq('id', userId);

      set({
        identitySnapshots: next,
        lastMirrorSnapshot: snapshotText,
        mirrorLoading: false,
      });
      const { data: rows } = await supabase
        .from('journey_entries')
        .select('id, entry_type, stage, content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200);
      set({ entries: (rows ?? []) as JourneyEntryRow[] });
      await get().refreshMirror();
    } catch (e) {
      set({
        mirrorLoading: false,
        lastError: e instanceof Error ? e.message : String(e),
      });
    }
  },

  logSomatic: async (tension: number, energy: number, emotion: number, note?: string) => {
    const { userId, somaticLogs } = get();
    if (!userId) return;
    const entry: SomaticEntry = {
      id: uid(),
      tension,
      energy,
      emotion,
      note,
      createdAt: new Date().toISOString(),
    };
    const next = [entry, ...somaticLogs].slice(0, 120);
    await supabase
      .from('profiles')
      .update({ somatic_logs: next as unknown as object })
      .eq('id', userId);
    set({ somaticLogs: next });
    await supabase.from('journey_entries').insert({
      user_id: userId,
      entry_type: 'somatic',
      content: { tension, energy, emotion, note },
    });
  },

  saveMythicChapter: async (stageId: string, text: string) => {
    const { userId } = get();
    if (!userId) return;
    await supabase.from('journey_entries').insert({
      user_id: userId,
      entry_type: 'mythic',
      stage: stageId,
      content: { text },
    });
    set((s) => ({
      mythicProgress: {
        ...s.mythicProgress,
        [stageId]: { lastExcerpt: text.slice(0, 160), updatedAt: new Date().toISOString() },
      },
    }));
  },

  markJourneyLaunchSeen: async () => {
    const { userId } = get();
    if (!userId) return;
    await supabase.from('profiles').update({ journey_launch_seen: true }).eq('id', userId);
  },

  runRecalibration: async () => {
    const { userId, onboardingAnswers } = get();
    if (!userId) throw new Error('Not signed in');
    const summary = `Pattern scan: your stated focus (“${String(
      onboardingAnswers?.biggestGoal12Months ?? 'growth'
    ).slice(0, 80)}…”) suggests a rebirth arc. Next 90 days: one identity ritual weekly, one somatic check-in daily, one mirror question when resistance spikes.`;
    await supabase.from('journey_entries').insert({
      user_id: userId,
      entry_type: 'recalibration',
      content: { summary, at: new Date().toISOString() },
    });
    return { summary };
  },
}));

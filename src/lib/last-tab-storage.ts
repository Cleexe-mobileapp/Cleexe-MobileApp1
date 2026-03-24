import AsyncStorage from '@react-native-async-storage/async-storage';

export const LAST_TAB_KEY = '@cleexe_last_tab';

export const VALID_TAB_SEGMENTS = ['home', 'growth', 'team', 'ask', 'profile'] as const;

export type TabSegment = (typeof VALID_TAB_SEGMENTS)[number];

export function normalizeTabSegment(value: string | null | undefined): TabSegment {
  if (value && (VALID_TAB_SEGMENTS as readonly string[]).includes(value)) {
    return value as TabSegment;
  }
  return 'home';
}

export async function getPersistedTabSegment(): Promise<TabSegment> {
  try {
    const raw = await AsyncStorage.getItem(LAST_TAB_KEY);
    return normalizeTabSegment(raw);
  } catch {
    return 'home';
  }
}

export async function setPersistedTabSegment(segment: TabSegment): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_TAB_KEY, segment);
  } catch {
    /* ignore */
  }
}

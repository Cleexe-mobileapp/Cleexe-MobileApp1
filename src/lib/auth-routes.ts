import { router } from 'expo-router';
import { getPersistedTabSegment, type TabSegment } from './last-tab-storage';

/** After sign-in / sign-up when onboarding is already complete — open last tab (or home). */
export async function replaceWithMainTabs() {
  const tab = await getPersistedTabSegment();
  router.replace(`/(tabs)/${tab}` as const);
}

export function replaceWithOnboarding(params?: { source?: string; email?: string }) {
  router.replace({
    pathname: '/(onboarding)/onboarding-questions',
    params: {
      source: params?.source ?? 'auth',
      ...(params?.email ? { email: params.email } : {}),
    },
  });
}

export function replaceWithWelcome() {
  router.replace('/(auth)/welcome');
}

export function tabsHref(segment: TabSegment) {
  return `/(tabs)/${segment}` as const;
}

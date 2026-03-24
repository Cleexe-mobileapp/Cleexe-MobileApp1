import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Redirect, Tabs, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { useAuthSession } from '@/src/context/AuthSessionProvider';
import {
  setPersistedTabSegment,
  type TabSegment,
} from '@/src/lib/last-tab-storage';
import { useTheme } from '@/src/theme/ThemeContext';

function TabBarBackground() {
  const t = useTheme();
  return (
    <BlurView
      intensity={t.tier === 'calm' ? 80 : 60}
      tint={t.tier === 'calm' ? 'light' : 'dark'}
      style={StyleSheet.absoluteFill}
    />
  );
}

const TAB_NAMES = ['home', 'growth', 'team', 'ask', 'profile'] as const;

function isTabSegment(name: string | null | undefined): name is TabSegment {
  return !!name && (TAB_NAMES as readonly string[]).includes(name);
}

export default function TabsLayout() {
  const t = useTheme();
  const segments = useSegments();
  const { initializing, session, onboardingCompleted } = useAuthSession();

  useEffect(() => {
    const tabsIdx = segments.indexOf('(tabs)');
    const segment = tabsIdx >= 0 ? segments[tabsIdx + 1] : undefined;
    if (segment != null && isTabSegment(segment)) {
      void setPersistedTabSegment(segment);
    }
  }, [segments]);

  if (initializing) {
    return null;
  }

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!onboardingCompleted) {
    return <Redirect href="/(onboarding)" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.tabActive,
        tabBarInactiveTintColor: t.tabInactive,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : t.tabBg,
          borderTopWidth: 1,
          borderTopColor: t.tabBorder,
          height: 88,
          paddingBottom: 28,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarBackground: Platform.OS === 'ios' ? () => <TabBarBackground /> : undefined,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
      screenListeners={{
        state: (e) => {
          const state = e.data.state;
          const route = state.routes[state.index];
          const name = route?.name;
          if (isTabSegment(name)) {
            void setPersistedTabSegment(name);
          }
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="growth"
        options={{
          title: 'Growth',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'trending-up' : 'trending-up-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'Team',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ask"
        options={{
          title: 'Ask',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'help-circle' : 'help-circle-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

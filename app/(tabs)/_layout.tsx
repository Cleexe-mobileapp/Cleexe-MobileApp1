import { BlurView } from 'expo-blur';
import { Redirect, Tabs, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { ComponentType } from 'react';

import { useAuthSession } from '@/src/context/AuthSessionProvider';
import {
  setPersistedTabSegment,
  type TabSegment,
} from '@/src/lib/last-tab-storage';
import {
  AskBubbleSeedIcon,
  GrowthLeafChartIcon,
  HomePlantIcon,
  ProfileHaloIcon,
  TeamConnectionIcon,
} from '@/src/components/icons/CleexeIcons';
import { useTheme } from '@/src/theme/ThemeContext';

/**
 * Cross-platform tab bar background.
 * iOS: frosted-glass BlurView.
 * Android: BlurView + solid tinted fallback behind it so the effect
 *          looks identical even on devices where blur isn't supported.
 */
function TabBarBackground() {
  const t = useTheme();
  const isLight = t.tier === 'calm';

  return (
    <View style={StyleSheet.absoluteFill}>
      {isLight && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor:
                Platform.OS === 'android' ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.55)',
            },
          ]}
        />
      )}
      {!isLight && Platform.OS === 'android' && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.tabBg }]} />
      )}
      <BlurView
        intensity={isLight ? 50 : 60}
        tint={isLight ? 'light' : 'dark'}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

type TabGlyphProps = { size: number; color: string; focused: boolean };

function TabIconWithDot({
  Icon,
  color,
  size,
  focused,
  activeColor,
}: {
  Icon: ComponentType<TabGlyphProps>;
  color: string;
  size: number;
  focused: boolean;
  activeColor: string;
}) {
  return (
    <View style={tabIconStyles.wrap}>
      <Icon size={size + 2} color={color} focused={focused} />
      <View style={tabIconStyles.dotSlot}>
        {focused ? <View style={[tabIconStyles.dot, { backgroundColor: activeColor }]} /> : null}
      </View>
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'flex-start' },
  dotSlot: {
    height: 6,
    marginTop: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});

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
          backgroundColor: 'transparent',
          borderTopWidth: 1,
          borderTopColor: t.tabBorder,
          height: Platform.select({ ios: 88, android: 72 }),
          paddingBottom: Platform.select({ ios: 28, android: 12 }),
          paddingTop: 8,
          elevation: 0,
        },
        tabBarBackground: () => <TabBarBackground />,
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
            <TabIconWithDot
              Icon={HomePlantIcon}
              color={color}
              size={size}
              focused={focused}
              activeColor={t.tabActive}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="growth"
        options={{
          title: 'Growth',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIconWithDot
              Icon={GrowthLeafChartIcon}
              color={color}
              size={size}
              focused={focused}
              activeColor={t.tabActive}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'Team',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIconWithDot
              Icon={TeamConnectionIcon}
              color={color}
              size={size}
              focused={focused}
              activeColor={t.tabActive}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ask"
        options={{
          title: 'Ask',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIconWithDot
              Icon={AskBubbleSeedIcon}
              color={color}
              size={size}
              focused={focused}
              activeColor={t.tabActive}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIconWithDot
              Icon={ProfileHaloIcon}
              color={color}
              size={size}
              focused={focused}
              activeColor={t.tabActive}
            />
          ),
        }}
      />
    </Tabs>
  );
}

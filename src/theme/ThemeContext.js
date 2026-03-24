import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Streak-based theme system — three tiers that evolve with the user
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const THEME_TIERS = {
  calm: {
    tier: 'calm',
    // Backgrounds
    bg: '#F8FAFF',
    bgDeep: '#EEF2FF',
    surface: 'rgba(255,255,255,0.85)',
    surfaceElevated: 'rgba(255,255,255,0.95)',
    // Card (premium whisper shadow)
    cardBg: '#FFFFFF',
    cardBorder: 'rgba(0,0,0,0.03)',
    cardShadowColor: '#000',
    cardShadowOffset: { width: 0, height: 12 },
    cardShadowOpacity: 0.04,
    cardShadowRadius: 16,
    cardElevation: 3,
    cardRadius: 24,
    // Glass (frosted card with white inner border)
    glassBg: 'rgba(255,255,255,0.5)',
    glassBorder: 'rgba(255,255,255,0.3)',
    glassBlurTint: 'light',
    glassBlurIntensity: 20,
    // Colors
    primary: '#4F6AFF',
    primaryMuted: 'rgba(79,106,255,0.12)',
    accent: '#6366F1',
    accentMuted: 'rgba(99,102,241,0.10)',
    gold: '#D97706',
    // Text
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textOnPrimary: '#FFFFFF',
    // Chrome button
    chromeBg: '#4F6AFF',
    chromeShine: 'rgba(255,255,255,0.35)',
    chromeShadow: 'rgba(79,106,255,0.18)',
    // Tab bar
    tabBg: 'rgba(255,255,255,0.92)',
    tabBorder: 'rgba(0,0,0,0.04)',
    tabActive: '#4F6AFF',
    tabInactive: '#B4B9C5',
    // Semantic
    separator: 'rgba(0,0,0,0.04)',
    inputBg: 'rgba(255,255,255,0.7)',
    inputBorder: 'rgba(0,0,0,0.06)',
    // Mesh orbs
    orbPrimary: 'rgba(79,106,255,0.08)',
    orbSecondary: 'rgba(99,102,241,0.05)',
  },
  ascend: {
    tier: 'ascend',
    bg: '#0D0A1A',
    bgDeep: '#080612',
    surface: 'rgba(139,92,246,0.06)',
    surfaceElevated: 'rgba(139,92,246,0.10)',
    cardBg: 'rgba(20,16,40,0.90)',
    cardBorder: 'rgba(139,92,246,0.10)',
    cardShadowColor: '#000',
    cardShadowOffset: { width: 0, height: 16 },
    cardShadowOpacity: 0.25,
    cardShadowRadius: 20,
    cardElevation: 6,
    cardRadius: 24,
    glassBg: 'rgba(30,20,60,0.50)',
    glassBorder: 'rgba(255,255,255,0.12)',
    glassBlurTint: 'dark',
    glassBlurIntensity: 25,
    primary: '#8B5CF6',
    primaryMuted: 'rgba(139,92,246,0.15)',
    accent: '#FFD166',
    accentMuted: 'rgba(255,209,102,0.12)',
    gold: '#FFD166',
    textPrimary: '#F3F0FF',
    textSecondary: '#A78BFA',
    textMuted: '#7C6CAA',
    textOnPrimary: '#FFFFFF',
    chromeBg: '#8B5CF6',
    chromeShine: 'rgba(255,209,102,0.30)',
    chromeShadow: 'rgba(139,92,246,0.20)',
    tabBg: 'rgba(13,10,26,0.95)',
    tabBorder: 'rgba(139,92,246,0.08)',
    tabActive: '#A78BFA',
    tabInactive: '#4A3D6A',
    separator: 'rgba(139,92,246,0.08)',
    inputBg: 'rgba(139,92,246,0.06)',
    inputBorder: 'rgba(139,92,246,0.12)',
    orbPrimary: 'rgba(139,92,246,0.10)',
    orbSecondary: 'rgba(255,209,102,0.06)',
  },
  elite: {
    tier: 'elite',
    bg: '#050505',
    bgDeep: '#000000',
    surface: 'rgba(255,215,0,0.03)',
    surfaceElevated: 'rgba(255,215,0,0.06)',
    cardBg: 'rgba(12,12,8,0.92)',
    cardBorder: 'rgba(255,215,0,0.06)',
    cardShadowColor: '#000',
    cardShadowOffset: { width: 0, height: 20 },
    cardShadowOpacity: 0.35,
    cardShadowRadius: 24,
    cardElevation: 8,
    cardRadius: 24,
    glassBg: 'rgba(10,10,10,0.50)',
    glassBorder: 'rgba(255,255,255,0.08)',
    glassBlurTint: 'dark',
    glassBlurIntensity: 30,
    primary: '#FFD700',
    primaryMuted: 'rgba(255,215,0,0.10)',
    accent: '#FFC107',
    accentMuted: 'rgba(255,193,7,0.10)',
    gold: '#FFD700',
    textPrimary: '#FAFAF5',
    textSecondary: '#D4AF37',
    textMuted: '#6B6340',
    textOnPrimary: '#050505',
    chromeBg: '#FFD700',
    chromeShine: 'rgba(255,255,255,0.40)',
    chromeShadow: 'rgba(255,215,0,0.18)',
    tabBg: 'rgba(5,5,5,0.97)',
    tabBorder: 'rgba(255,215,0,0.06)',
    tabActive: '#FFD700',
    tabInactive: '#4A4530',
    separator: 'rgba(255,215,0,0.06)',
    inputBg: 'rgba(255,215,0,0.04)',
    inputBorder: 'rgba(255,215,0,0.10)',
    orbPrimary: 'rgba(255,215,0,0.08)',
    orbSecondary: 'rgba(255,193,7,0.04)',
  },
};

function getTier(streak) {
  if (streak >= 60) return 'elite';
  if (streak >= 30) return 'ascend';
  return 'calm';
}

const ThemeContext = createContext(THEME_TIERS.calm);

export function ThemeProvider({ children }) {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem('@cleexe_streak');
        if (cached) setStreak(parseInt(cached, 10) || 0);
      } catch (_e) { /* ignore */ }

      if (!supabase) return;
      try {
        const { data } = await supabase.auth.getUser();
        const s = data?.user?.user_metadata?.streak ?? 0;
        setStreak(s);
        AsyncStorage.setItem('@cleexe_streak', String(s)).catch(() => {});
      } catch (_e) { /* ignore */ }
    })();
  }, []);

  const theme = useMemo(() => {
    const tier = getTier(streak);
    return { ...THEME_TIERS[tier], streak, setStreak };
  }, [streak]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export { THEME_TIERS, getTier };

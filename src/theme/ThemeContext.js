import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

import { BRAND } from './brand';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Cleexe brand — twilight purple + teal growth accents (see src/theme/brand.js)
// Tiers: calm (light lavender), ascend (default dark), elite (gold + purple depth)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const THEME_TIERS = {
  // ── Light / Calm — white / grey neutrals + purple accents (see BRAND.neutral*) ─
  calm: {
    tier: 'calm',

    bg: BRAND.neutralBackground,
    bgDeep: BRAND.neutralSurface,
    bgGradientStart: BRAND.neutralBackground,
    bgGradientEnd: BRAND.neutralSurface,

    surface: 'rgba(249,250,251,0.96)',
    surfaceElevated: BRAND.neutralBackground,
    surfaceSolid: BRAND.neutralSurface,

    cardBg: 'rgba(255,255,255,0.88)',
    cardBorder: BRAND.neutralBorder,
    cardShadowColor: '#1E1B4B',
    cardShadowOffset: { width: 0, height: 2 },
    cardShadowOpacity: 0.04,
    cardShadowRadius: 8,
    cardElevation: 1,
    cardRadius: 20,

    glassBg: 'rgba(255,255,255,0.60)',
    glassBorder: 'rgba(107,78,255,0.12)',
    glassBlurTint: 'light',
    glassBlurIntensity: 40,

    primary: BRAND.primaryAction,
    primarySoft: BRAND.purpleGradientStart,
    primaryMuted: 'rgba(139,92,246,0.12)',
    accent: BRAND.teal,
    accentMuted: 'rgba(0,212,200,0.12)',
    gold: BRAND.gold,

    textPrimary: BRAND.textOnLight,
    textHeading: BRAND.textHeadingLight,
    textUtility: BRAND.primaryAction,
    textSecondary: '#5C5770',
    textMuted: BRAND.textMuted,
    textOnPrimary: '#FFFFFF',
    textOnAccent: '#0A1628',

    chromeBg: BRAND.primaryAction,
    chromeShine: 'rgba(255,255,255,0.18)',
    chromeShadow: 'rgba(74,46,204,0.25)',

    tabBg: 'rgba(255,255,255,0.82)',
    tabBorder: BRAND.neutralBorder,
    tabActive: BRAND.primaryAction,
    tabInactive: BRAND.textMuted,

    separator: BRAND.neutralBorder,
    inputBg: BRAND.neutralBackground,
    inputBorder: BRAND.neutralBorder,

    orbPrimary: 'rgba(107,78,255,0.06)',
    orbSecondary: 'rgba(0,212,200,0.05)',

    gradientCtaStart: BRAND.gradientButtonStart,
    gradientCtaEnd: BRAND.gradientButtonEnd,
    coral: BRAND.coral,
    success: BRAND.success,
  },

  // ── Dark / Ascend — default Cleexe twilight (purple–indigo) ───────────────
  ascend: {
    tier: 'ascend',

    bg: BRAND.bgStart,
    bgDeep: BRAND.bgEnd,
    bgGradientStart: BRAND.bgStart,
    bgGradientEnd: BRAND.bgEnd,

    surface: 'rgba(255,255,255,0.05)',
    surfaceElevated: 'rgba(255,255,255,0.08)',
    surfaceSolid: BRAND.surfaceCardSolid,

    cardBg: 'rgba(37,33,66,0.72)',
    cardBorder: BRAND.borderLavenderOnDark,
    cardShadowColor: '#000',
    cardShadowOffset: { width: 0, height: 2 },
    cardShadowOpacity: 0.12,
    cardShadowRadius: 10,
    cardElevation: 2,
    cardRadius: 20,

    glassBg: BRAND.glass15,
    glassBorder: 'rgba(184,179,209,0.12)',
    glassBlurTint: 'dark',
    glassBlurIntensity: 48,

    primary: BRAND.primaryAction,
    primarySoft: BRAND.purpleSoft,
    primaryMuted: 'rgba(139,92,246,0.18)',
    accent: BRAND.teal,
    accentMuted: 'rgba(0,212,200,0.14)',
    gold: BRAND.gold,

    textPrimary: BRAND.textPrimary,
    textHeading: BRAND.textPrimary,
    textUtility: BRAND.primaryAction,
    textSecondary: BRAND.textSecondary,
    textMuted: BRAND.textMuted,
    textOnPrimary: '#FFFFFF',
    textOnAccent: '#061018',

    chromeBg: BRAND.primaryAction,
    chromeShine: 'rgba(255,255,255,0.2)',
    chromeShadow: 'rgba(0,0,0,0.35)',

    tabBg: BRAND.tabBarBg,
    tabBorder: 'rgba(184,179,209,0.12)',
    tabActive: BRAND.primaryAction,
    tabInactive: BRAND.textSecondary,

    separator: 'rgba(184,179,209,0.10)',
    inputBg: 'rgba(255,255,255,0.06)',
    inputBorder: 'rgba(184,179,209,0.14)',

    orbPrimary: 'rgba(139,92,246,0.14)',
    orbSecondary: 'rgba(0,212,200,0.08)',

    gradientCtaStart: BRAND.gradientButtonStart,
    gradientCtaEnd: BRAND.gradientButtonEnd,
    coral: BRAND.coral,
    success: BRAND.success,
  },

  // ── Elite — gold achievements + deep purple ───────────────────────────────
  elite: {
    tier: 'elite',

    bg: '#15102A',
    bgDeep: '#0D0A18',
    bgGradientStart: '#1A1435',
    bgGradientEnd: '#0D0A18',

    surface: 'rgba(255,209,102,0.06)',
    surfaceElevated: 'rgba(255,209,102,0.10)',
    surfaceSolid: '#1E1838',

    cardBg: 'rgba(30,24,56,0.78)',
    cardBorder: 'rgba(255,209,102,0.18)',
    cardShadowColor: '#000',
    cardShadowOffset: { width: 0, height: 2 },
    cardShadowOpacity: 0.14,
    cardShadowRadius: 10,
    cardElevation: 2,
    cardRadius: 20,

    glassBg: 'rgba(21,16,42,0.55)',
    glassBorder: 'rgba(255,209,102,0.10)',
    glassBlurTint: 'dark',
    glassBlurIntensity: 52,

    primary: BRAND.gold,
    primarySoft: '#FFE08A',
    primaryMuted: 'rgba(255,209,102,0.14)',
    accent: BRAND.purple,
    accentMuted: 'rgba(107,78,255,0.16)',
    gold: BRAND.gold,

    textPrimary: BRAND.textPrimary,
    textHeading: BRAND.textPrimary,
    textUtility: BRAND.primaryAction,
    textSecondary: BRAND.textSecondary,
    textMuted: '#7A7399',
    textOnPrimary: '#1A1435',
    textOnAccent: '#FFFFFF',

    chromeBg: BRAND.gold,
    chromeShine: 'rgba(255,255,255,0.25)',
    chromeShadow: 'rgba(255,209,102,0.2)',

    tabBg: 'rgba(21,16,42,0.98)',
    tabBorder: 'rgba(255,209,102,0.10)',
    tabActive: BRAND.gold,
    tabInactive: '#6B6288',

    separator: 'rgba(184,179,209,0.08)',
    inputBg: 'rgba(255,209,102,0.05)',
    inputBorder: 'rgba(255,209,102,0.12)',

    orbPrimary: 'rgba(255,209,102,0.10)',
    orbSecondary: 'rgba(107,78,255,0.10)',

    gradientCtaStart: BRAND.gradientButtonStart,
    gradientCtaEnd: BRAND.gradientButtonEnd,
    coral: BRAND.coral,
    success: BRAND.success,
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

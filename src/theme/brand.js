/**
 * Cleexe brand system — twilight purple + teal growth + coral/gold energy.
 * Use `BRAND` for quick access, or `PURPLE` / `TEAL` / `CORAL` / `GOLD` scales.
 *
 * Logo & onboarding / main CTAs: gradient PURPLE[500] → PURPLE[700] (#8A6FFF → #5A3BE8)
 * Progress rings/bars: purple → teal gradient (see progressGradient*)
 * AI: teal accents + purple glow
 * Nav: tabBarBg, active PURPLE[600]
 */

/** Purple scale (hero brand). Primary CTAs use `BRAND.primaryAction` (#8B5CF6), not necessarily [600]. */
export const PURPLE = {
  100: '#F0EBFF',
  200: '#E0D6FF',
  300: '#C4B4FF',
  400: '#A38EFF',
  500: '#8A6FFF',
  600: '#6B4EFF',
  700: '#5A3BE8',
  800: '#4A2ECC',
  900: '#3F2BA6',
};

/** Teal — AI, progress, growth */
export const TEAL = {
  100: '#E0FAF7',
  400: '#4AE6DB',
  500: '#00D4C8',
  600: '#00B8AE',
};

/** Coral — energy, highlights, streaks */
export const CORAL = {
  400: '#FF8A8A',
  500: '#FF6B6B',
};

/** Gold — achievements, streaks */
export const GOLD = {
  300: '#FFE8A3',
  500: '#FFD166',
};

export const BRAND = {
  // —— Primary brand ——
  /** Vibrant CTA / icons (Tailwind violet-500 / “electric purple”) */
  primaryAction: '#8B5CF6',
  /** Deeper violet for gradient starts, pressed states */
  primaryActionDeep: '#7C3AED',
  /** @deprecated use primaryAction — kept for imports expecting `purple` */
  purple: '#8B5CF6',
  purpleGradientStart: PURPLE[500],
  purpleGradientEnd: PURPLE[700],
  purpleDark: PURPLE[800],
  purpleDarkest: PURPLE[900],
  /** Softer purple for secondary emphasis */
  purpleSoft: PURPLE[400],
  tealLight: TEAL[100],
  coralSoft: CORAL[400],
  goldSoft: GOLD[300],

  teal: TEAL[500],
  coral: CORAL[500],
  gold: GOLD[500],

  /**
   * Neutral stack (Tailwind-aligned light UI).
   * background → page; surface → panels/cards; border → hairlines.
   */
  neutralBackground: '#FFFFFF',
  neutralSurface: '#F9FAFB',
  neutralBorder: '#EDEDED',

  // —— Background (dark app gradient) ——
  bgStart: '#1E1B4B',
  bgEnd: '#2A1F5F',
  /** Slightly deeper than bgStart for layering */
  bgDeep: '#17142F',

  /** Solid card / panel on dark (#2A2549) */
  surfaceCardSolid: '#2A2549',

  /**
   * Glassmorphic overlay ≈ #FFFFFF15 (15/255 alpha)
   * Use with BlurView for cards; on RN plain View use as backgroundColor.
   */
  glass15: 'rgba(255, 255, 255, 0.082)',
  /** Slightly stronger glass */
  glass12: 'rgba(255, 255, 255, 0.09)',

  /** Legacy alias */
  cardGlass: 'rgba(255, 255, 255, 0.082)',
  /** Faint purple-tinted white — calm surfaces / cards (not pure white) */
  surfaceLight: '#F5F3FF',
  surfaceLightMuted: '#EDE9FE',
  cardLightTint: '#F5F3FF',
  /** @deprecated alias — use neutralSurface */
  surfaceCoolGrey: '#F9FAFB',
  /** Grok / featured insight panel — off-white purple */
  grokInsightBg: '#F9F8FF',
  /** Pro Insight cards: grey with purple tint (E5E7EB → purple) */
  borderInsightSoft: '#E8E6F0',
  /** Icon wells — Pro Insights */
  insightWellYellow: '#FFFBEB',
  insightWellPurple: '#F3E8FF',

  /** Navigation bar (dark) */
  tabBarBg: '#2A1F5F',

  /** 1px card border — light lavender (calm / light surfaces) */
  borderLavender: 'rgba(196, 181, 253, 0.45)',
  /** Slightly stronger on white cards */
  borderLavenderCrisp: 'rgba(167, 139, 250, 0.42)',
  /** Dark-mode cards: lavender hairline on purple surfaces */
  borderLavenderOnDark: 'rgba(196, 181, 253, 0.22)',

  // —— Text ——
  textPrimary: '#FFFFFF',
  textOnLight: '#1F1F2E',
  /** Bold section titles on light backgrounds */
  textHeadingLight: '#1F2937',
  textSecondary: '#B8B3D1',
  textMuted: '#8A85B0',
  bodyOnDark: '#E8E5FF',

  // —— Semantic ——
  success: '#4ADE80',
  warning: '#FFB74D',
  error: '#FF5A5F',

  // —— Feature gradients ——
  /** Progress rings / bars: purple → teal */
  progressGradientStart: PURPLE[500],
  progressGradientEnd: TEAL[500],

  /** Logo / hero (deeper brand gradient) */
  logoGradientFrom: '#8A6FFF',
  logoGradientTo: '#5A3BE8',

  /**
   * Main buttons: deep violet → lighter orchid/violet (white label).
   * Prefer over flat green blocks.
   */
  gradientButtonStart: '#7C3AED',
  gradientButtonEnd: '#A78BFA',

  /**
   * Large fills (cards, hype panels): saturated violet → pale orchid.
   */
  gradientSurfaceOrchidStart: '#8B5CF6',
  gradientSurfaceOrchidEnd: '#DDD6FE',

  // —— Future Self cards (home) ——
  futureWarmBg: '#2C1810',
  futureWarmBorder: '#78350F',
  futureWarmTitle: '#FBBF24',
  futureWarmBody: '#FDE68A',

  /** “Hype” card — purple → orchid gradient (replaces solid green) */
  futureHypeTitle: '#5B21B6',
  futureHypeBody: '#4C1D95',
  futureHypeSig: '#6D28D9',
};

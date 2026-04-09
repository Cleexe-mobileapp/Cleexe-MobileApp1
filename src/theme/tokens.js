/**
 * Design tokens — spacing, typography, radii, shadows, glass presets.
 *
 * Brand colors (Cleexe purple / twilight / teal): see `brand.js` + `ThemeContext.js`.
 */

export { BRAND, PURPLE, TEAL, CORAL, GOLD } from './brand';

export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const RADIUS = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 24,
  pill: 999,
};

export const TYPOGRAPHY = {
  h1: { fontSize: 28, fontWeight: '600', letterSpacing: -0.4 },
  h2: { fontSize: 22, fontWeight: '600', letterSpacing: -0.2 },
  h3: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 23 },
  bodyMedium: { fontSize: 15, fontWeight: '500', lineHeight: 23 },
  caption: { fontSize: 13, fontWeight: '500' },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  small: { fontSize: 11, fontWeight: '400' },
};

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.07,
    shadowRadius: 40,
    elevation: 5,
  },
};

export const GLASS = {
  light: {
    bg: 'rgba(255,255,255,0.55)',
    border: 'rgba(255,255,255,0.60)',
    blurTint: 'light',
    blurIntensity: 40,
  },
  dark: {
    bg: 'rgba(30,30,30,0.50)',
    border: 'rgba(255,255,255,0.06)',
    blurTint: 'dark',
    blurIntensity: 45,
  },
};

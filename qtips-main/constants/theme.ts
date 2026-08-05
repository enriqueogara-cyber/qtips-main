/**
 * QTips Design System — Fintech theme
 * Centralised tokens for colours, shadows, borders and typography.
 * Import from this file instead of hardcoding values in each screen.
 */

import { Platform } from 'react-native';

// ─── Colour palette ──────────────────────────────────────────────────────────

export const C = {
  // Brand violet
  VIOLET_PRIMARY:     '#6C4DFF',
  VIOLET_DARK:        '#4D32D7',
  VIOLET_HOVER:       '#5939F0',
  VIOLET_LIGHT:       '#8B6FFF',
  VIOLET_SUBTLE:      '#EEE9FF',
  VIOLET_EXTRA_LIGHT: '#F6F3FF',
  VIOLET_BORDER:      '#C8B8FF',

  // Positive / money
  GREEN_POSITIVE:  '#16A66A',
  GREEN_SUBTLE:    '#EAF8F2',
  GREEN_BORDER:    '#6EE7B7',

  // Text
  TEXT_PRIMARY:    '#171721',
  TEXT_SECONDARY:  '#686879',
  TEXT_TERTIARY:   '#9B9BAD',

  // Backgrounds
  BG_SCREEN:       '#F7F8FC',
  BG_CARD:         '#FFFFFF',
  BG_INPUT:        '#F8FAFC',

  // Borders
  BORDER:          '#E8E8F0',
  BORDER_INPUT:    '#E2E8F0',

  // Semantic
  ERROR:           '#DC3545',
  ERROR_SUBTLE:    '#FEF2F2',
  WARNING:         '#F59E0B',

  // Legacy aliases kept for backward compat
  VIOLET:          '#6C4DFF',
  GREY_LIGHT:      '#F7F8FC',
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const SHADOW = {
  sm: {
    shadowColor: '#171721',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#171721',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#171721',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  violet: {
    shadowColor: '#6C4DFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 8,
  },
  violetSm: {
    shadowColor: '#6C4DFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

// ─── Border radii ─────────────────────────────────────────────────────────────

export const RADIUS = {
  xs:   8,
  sm:   12,
  md:   16,
  lg:   20,
  xl:   24,
  full: 999,
} as const;

// ─── Spacing scale ────────────────────────────────────────────────────────────

export const S = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

// ─── Common sizes ─────────────────────────────────────────────────────────────

export const SIZE = {
  tabBar:         62,
  tabBarIcon:     24,
  buttonHeight:   52,
  buttonHeightSm: 44,
  inputHeight:    52,
  avatarSm:       32,
  avatarMd:       44,
  avatarLg:       56,
  iconSm:         16,
  iconMd:         20,
  iconLg:         24,
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const FONT = {
  h1: { fontSize: 32, fontWeight: '800' as const, color: C.TEXT_PRIMARY },
  h2: { fontSize: 26, fontWeight: '800' as const, color: C.TEXT_PRIMARY },
  h3: { fontSize: 20, fontWeight: '800' as const, color: C.TEXT_PRIMARY },
  h4: { fontSize: 17, fontWeight: '700' as const, color: C.TEXT_PRIMARY },
  body: { fontSize: 15, fontWeight: '400' as const, color: C.TEXT_PRIMARY },
  bodyMd: { fontSize: 14, fontWeight: '400' as const, color: C.TEXT_SECONDARY },
  label: { fontSize: 11, fontWeight: '700' as const, color: C.TEXT_TERTIARY, textTransform: 'uppercase' as const, letterSpacing: 0.6 },
  caption: { fontSize: 12, fontWeight: '400' as const, color: C.TEXT_TERTIARY },
} as const;

// ─── Legacy Colors export (keeps existing hook-based usage working) ───────────

const tintColorLight = C.VIOLET_PRIMARY;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: C.TEXT_PRIMARY,
    background: C.BG_SCREEN,
    tint: tintColorLight,
    icon: C.TEXT_SECONDARY,
    tabIconDefault: C.TEXT_TERTIARY,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

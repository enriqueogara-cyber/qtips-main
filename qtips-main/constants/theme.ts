/**
 * QTips Design System — Fintech theme
 * Centralised tokens for colours, shadows, borders and typography.
 * Import from this file instead of hardcoding values in each screen.
 */

import { Platform } from 'react-native';

// ─── Colour palette ──────────────────────────────────────────────────────────

export const C = {
  VIOLET_PRIMARY:  '#6D4AFF',
  VIOLET_DARK:     '#4930C8',
  VIOLET_LIGHT:    '#8B5CF6',
  VIOLET_SUBTLE:   '#EEF2FF',
  VIOLET_BORDER:   '#C4B5FD',

  GREEN_POSITIVE:  '#20D69B',
  GREEN_SUBTLE:    '#F0FDF4',
  GREEN_BORDER:    '#86EFAC',

  TEXT_PRIMARY:    '#111827',
  TEXT_SECONDARY:  '#667085',
  TEXT_TERTIARY:   '#94A3B8',

  BG_SCREEN:       '#F6F7FB',
  BG_CARD:         '#FFFFFF',
  BG_INPUT:        '#F8FAFC',

  BORDER:          '#E7E9F0',
  BORDER_INPUT:    '#E2E8F0',

  ERROR:           '#F04458',
  ERROR_SUBTLE:    '#FEF2F2',
  WARNING:         '#F79009',

  // Legacy aliases kept for backward compat
  VIOLET:          '#6D4AFF',
  GREY_LIGHT:      '#F6F7FB',
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  violet: {
    shadowColor: '#6D4AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  violetSm: {
    shadowColor: '#6D4AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
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

// ─── Typography ──────────────────────────────────────────────────────────────

export const FONT = {
  h1: { fontSize: 32, fontWeight: '800' as const, color: C.TEXT_PRIMARY },
  h2: { fontSize: 26, fontWeight: '800' as const, color: C.TEXT_PRIMARY },
  h3: { fontSize: 20, fontWeight: '800' as const, color: C.TEXT_PRIMARY },
  h4: { fontSize: 17, fontWeight: '700' as const, color: C.TEXT_PRIMARY },
  body: { fontSize: 15, fontWeight: '400' as const, color: C.TEXT_PRIMARY },
  bodyMd: { fontSize: 14, fontWeight: '400' as const, color: C.TEXT_SECONDARY },
  label: { fontSize: 12, fontWeight: '600' as const, color: C.TEXT_TERTIARY, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
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

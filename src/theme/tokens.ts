// The single source of STILL's visual identity. Change values here; components only read tokens.
// Colours are neutral placeholders: swap them for the final brand palette without touching any screen.

import { Easing } from 'react-native-reanimated';

const light = {
  background: '#F6F5F2',
  surface: '#FFFFFF',
  surfaceMuted: '#EEEDE9',
  border: '#E3E1DC',
  borderStrong: '#C9C6BF',
  text: '#121212',
  textMuted: '#5F5C57',
  textFaint: '#8E8A83',
  accent: '#121212',
  onAccent: '#FFFFFF',
  accentSoft: '#E6E4DF',
  positive: '#2F6B45',
  danger: '#A8322B',
  focus: '#121212',
  scrim: 'rgba(0,0,0,0.32)',
  shadow: '#000000',
};

export type Palette = typeof light;

// True black background so OLED pixels switch off.
const dark: Palette = {
  background: '#000000',
  surface: '#0D0D0D',
  surfaceMuted: '#171717',
  border: '#232323',
  borderStrong: '#3A3A3A',
  text: '#F3F2EF',
  textMuted: '#A7A49E',
  textFaint: '#75726D',
  accent: '#F3F2EF',
  onAccent: '#000000',
  accentSoft: '#1E1E1E',
  positive: '#7BC596',
  danger: '#F08A80',
  focus: '#F3F2EF',
  scrim: 'rgba(0,0,0,0.6)',
  shadow: '#000000',
};

export const palettes = { light, dark };

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48, huge: 64 } as const;

export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

export const hairline = 1;

export const fonts = {
  display: 'InstrumentSerif_400Regular',
  displayItalic: 'InstrumentSerif_400Regular_Italic',
} as const;

export const type = {
  display: { fontFamily: fonts.display, fontSize: 44, lineHeight: 48, letterSpacing: -0.6 },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.3 },
  numeral: { fontFamily: fonts.display, fontSize: 72, lineHeight: 76, letterSpacing: -1 },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24 },
  small: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, fontWeight: '600', textTransform: 'uppercase' },
} as const;

export type TypeVariant = keyof typeof type;

export const elevation = {
  none: {},
  raised: { shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
} as const;

// Motion: short ease-out for responses, nothing over 300 ms, nothing on repeated navigation.
export const motion = {
  easeOut: Easing.bezier(0.23, 1, 0.32, 1),
  pressScale: 0.97,
  pressMs: 120,
  enterMs: 240,
  enterOffset: 8,
  staggerMs: 40,
} as const;

export const touchTarget = 44;

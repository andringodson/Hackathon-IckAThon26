import { createContext, use, useEffect, useMemo, type ReactNode } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';

import type { ThemePreference } from '@/domain/types';

import { palettes, type Palette } from './tokens';

export interface Theme {
  scheme: 'light' | 'dark';
  colors: Palette;
}

const ThemeContext = createContext<Theme>({ scheme: 'light', colors: palettes.light });

// A separate context from app data, so a data change never re-renders every themed component.
export function ThemeProvider({ preference, children }: { preference: ThemePreference; children: ReactNode }) {
  const system = useColorScheme();
  const scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  // Keeps native UI (alerts, keyboard, date pickers) in the same mode as the app.
  // Web has no native UI to sync and no setColorScheme.
  useEffect(() => {
    if (Platform.OS !== 'web') Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  const value = useMemo(() => ({ scheme, colors: palettes[scheme] }), [scheme]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export const useTheme = () => use(ThemeContext);

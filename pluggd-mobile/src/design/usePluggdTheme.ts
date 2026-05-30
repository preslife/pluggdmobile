import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, createElement, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { pluggdDark, pluggdLight, type PluggdTheme } from './tokens';

export type PluggdThemeMode = 'system' | 'light' | 'dark';

const THEME_MODE_KEY = 'pluggd.themeMode';

type ThemeModeContextValue = {
  mode: PluggdThemeMode;
  setMode: (mode: PluggdThemeMode) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

function isThemeMode(value: string | null): value is PluggdThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function PluggdThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PluggdThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_MODE_KEY)
      .then((stored) => {
        if (isThemeMode(stored)) {
          setModeState(stored);
        }
      })
      .catch(() => undefined);
  }, []);

  const value = useMemo<ThemeModeContextValue>(
    () => ({
      mode,
      setMode: (nextMode) => {
        setModeState(nextMode);
        AsyncStorage.setItem(THEME_MODE_KEY, nextMode).catch(() => undefined);
      },
    }),
    [mode],
  );

  return createElement(ThemeModeContext.Provider, { value }, children);
}

export function usePluggdThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    return {
      mode: 'system' as PluggdThemeMode,
      setMode: () => undefined,
    };
  }
  return context;
}

export function usePluggdTheme(): PluggdTheme {
  const { mode } = usePluggdThemeMode();
  const systemScheme = useColorScheme();
  const resolvedMode = mode === 'system' ? systemScheme : mode;
  return resolvedMode === 'light' ? pluggdLight : pluggdDark;
}

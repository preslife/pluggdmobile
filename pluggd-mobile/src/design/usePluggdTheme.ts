import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, createElement, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, Platform, Settings, useColorScheme } from 'react-native';
import { pluggdDark, pluggdLight, type PluggdTheme } from './tokens';

export type PluggdThemeMode = 'system' | 'light' | 'dark';

const THEME_MODE_KEY = 'pluggd.themeMode';

type ThemeModeContextValue = {
  mode: PluggdThemeMode;
  resolvedScheme: 'light' | 'dark';
  isHydrated: boolean;
  setMode: (mode: PluggdThemeMode) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

function isThemeMode(value: string | null): value is PluggdThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

function applyNativeThemeMode(mode: PluggdThemeMode) {
  if (Platform.OS !== 'ios') return;
  Settings.set({ [THEME_MODE_KEY]: mode });
  Appearance.setColorScheme(mode === 'system' ? null : mode);
}

export function PluggdThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<PluggdThemeMode>('system');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_MODE_KEY)
      .then((stored) => {
        const nextMode = isThemeMode(stored) ? stored : 'system';
        applyNativeThemeMode(nextMode);
        setModeState(nextMode);
      })
      .catch(() => applyNativeThemeMode('system'))
      .finally(() => setIsHydrated(true));
  }, []);

  const setMode = useCallback((nextMode: PluggdThemeMode) => {
    applyNativeThemeMode(nextMode);
    setModeState(nextMode);
    AsyncStorage.setItem(THEME_MODE_KEY, nextMode).catch(() => undefined);
  }, []);

  const resolvedScheme = mode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : mode;

  const value = useMemo<ThemeModeContextValue>(
    () => ({
      mode,
      resolvedScheme,
      isHydrated,
      setMode,
    }),
    [isHydrated, mode, resolvedScheme, setMode],
  );

  return createElement(ThemeModeContext.Provider, { value }, children);
}

export function usePluggdThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    return {
      mode: 'system' as PluggdThemeMode,
      resolvedScheme: 'dark' as const,
      isHydrated: true,
      setMode: () => undefined,
    };
  }
  return context;
}

export function usePluggdTheme(): PluggdTheme {
  const { resolvedScheme } = usePluggdThemeMode();
  return resolvedScheme === 'light' ? pluggdLight : pluggdDark;
}

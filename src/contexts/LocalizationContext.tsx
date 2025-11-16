import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES
} from '@/lib/locales';
import type { LocaleCode, LocaleConfig } from '@/lib/locales';
export { SUPPORTED_LOCALES } from '@/lib/locales';
export type { LocaleCode, LocaleConfig } from '@/lib/locales';
import i18n from '@/lib/i18n';

export interface LocalizationSettings {
  locale: LocaleCode;
  currency: string;
  timezone: string;
  dateFormat: 'auto' | 'custom';
  customDateFormat?: string;
  timeFormat: '12h' | '24h';
}

export interface LocalizationContextType {
  settings: LocalizationSettings;
  updateSettings: (newSettings: Partial<LocalizationSettings>) => Promise<void>;
  getLocaleConfig: (locale?: LocaleCode) => LocaleConfig;
  detectUserLocale: () => LocaleCode;
  loading: boolean;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

const DEFAULT_SETTINGS: LocalizationSettings = {
  locale: DEFAULT_LOCALE, // Default to UK locale as per existing app
  currency: SUPPORTED_LOCALES[DEFAULT_LOCALE].currency,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London',
  dateFormat: 'auto',
  timeFormat: '24h'
};

export const LocalizationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<LocalizationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Detect user's locale based on browser settings
  const detectUserLocale = (): LocaleCode => {
    if (typeof navigator === 'undefined') {
      return DEFAULT_LOCALE;
    }

    const browserLocale = navigator.language || navigator.languages?.[0] || DEFAULT_LOCALE;
    
    // Try exact match first
    if (browserLocale in SUPPORTED_LOCALES) {
      return browserLocale as LocaleCode;
    }
    
    // Try language match (e.g., 'en' from 'en-US')
    const language = browserLocale.split('-')[0];
    const languageMatch = Object.keys(SUPPORTED_LOCALES).find(locale => 
      locale.startsWith(language + '-')
    ) as LocaleCode;
    
    if (languageMatch) {
      return languageMatch;
    }
    
    // Default fallback
    return 'en-GB';
  };

  // Get configuration for a specific locale
  const getLocaleConfig = (locale?: LocaleCode): LocaleConfig => {
    return SUPPORTED_LOCALES[locale || settings.locale];
  };

  // Load user settings from database
  const loadUserSettings = async () => {
    if (!user) {
      // For non-authenticated users, use detected locale with localStorage fallback
      const stored = typeof window !== 'undefined'
        ? localStorage.getItem('pluggd_locale_settings')
        : null;
      if (stored) {
        try {
          const parsedSettings = JSON.parse(stored);
          setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
          if (parsedSettings.locale) {
            void i18n.changeLanguage(parsedSettings.locale);
          }
        } catch (error) {
          console.warn('Failed to parse stored locale settings:', error);
        }
      } else {
        // Auto-detect locale for new users
        const detectedLocale = detectUserLocale();
        const detectedConfig = SUPPORTED_LOCALES[detectedLocale];
        const detectedSettings: LocalizationSettings = {
          ...DEFAULT_SETTINGS,
          locale: detectedLocale,
          currency: detectedConfig.currency,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || detectedConfig.timezone
        };
        setSettings(detectedSettings);
        if (typeof window !== 'undefined') {
          localStorage.setItem('pluggd_locale_settings', JSON.stringify(detectedSettings));
        }
        void i18n.changeLanguage(detectedLocale);
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('locale_settings')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }

      if (data?.locale_settings) {
        const userSettings = data.locale_settings as LocalizationSettings;
        setSettings({ ...DEFAULT_SETTINGS, ...userSettings });
        if (userSettings.locale) {
          void i18n.changeLanguage(userSettings.locale);
        }
      } else {
        // First time user - detect and save their locale
        const detectedLocale = detectUserLocale();
        const detectedConfig = SUPPORTED_LOCALES[detectedLocale];
        const detectedSettings: LocalizationSettings = {
          ...DEFAULT_SETTINGS,
          locale: detectedLocale,
          currency: detectedConfig.currency,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || detectedConfig.timezone
        };
        
        await updateUserSettings(detectedSettings);
        setSettings(detectedSettings);
        void i18n.changeLanguage(detectedLocale);
      }
    } catch (error) {
      console.error('Error loading user locale settings:', error);
      // Fallback to detected locale
      const detectedLocale = detectUserLocale();
      const detectedConfig = SUPPORTED_LOCALES[detectedLocale];
      setSettings({
        ...DEFAULT_SETTINGS,
        locale: detectedLocale,
        currency: detectedConfig.currency
      });
      void i18n.changeLanguage(detectedLocale);
    } finally {
      setLoading(false);
    }
  };

  // Save settings to database or localStorage
  const updateUserSettings = async (newSettings: LocalizationSettings) => {
    if (!user) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('pluggd_locale_settings', JSON.stringify(newSettings));
      }
      return;
    }

    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        locale_settings: newSettings
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      throw error;
    }
  };

  // Update settings (public API)
  const updateSettings = async (newSettings: Partial<LocalizationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    
    try {
      await updateUserSettings(updatedSettings);
      setSettings(updatedSettings);
      if (updatedSettings.locale) {
        void i18n.changeLanguage(updatedSettings.locale);
      }
    } catch (error) {
      console.error('Error updating locale settings:', error);
      throw error;
    }
  };

  // Load settings on mount and when user changes
  useEffect(() => {
    loadUserSettings();
  }, [user]);

  return (
    <LocalizationContext.Provider value={{
      settings,
      updateSettings,
      getLocaleConfig,
      detectUserLocale,
      loading
    }}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};

type TestLocalizationOverrides = Partial<Omit<LocalizationContextType, 'settings'>> & {
  settings?: Partial<LocalizationSettings>;
};

export const createTestLocalizationValue = (
  overrides: TestLocalizationOverrides = {}
): LocalizationContextType => {
  const baseSettings: LocalizationSettings = {
    ...DEFAULT_SETTINGS,
    ...overrides.settings,
  };

  return {
    settings: baseSettings,
    updateSettings: async () => Promise.resolve(),
    getLocaleConfig: (locale?: LocaleCode) => SUPPORTED_LOCALES[locale ?? baseSettings.locale],
    detectUserLocale: () => baseSettings.locale,
    loading: false,
    ...overrides,
    settings: baseSettings,
  };
};

export const LocalizationTestProvider = ({
  children,
  value,
}: {
  children: ReactNode;
  value?: TestLocalizationOverrides;
}) => {
  const contextValue = createTestLocalizationValue(value);

  return (
    <LocalizationContext.Provider value={contextValue}>
      {children}
    </LocalizationContext.Provider>
  );
};

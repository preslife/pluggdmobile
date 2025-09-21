import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Supported locales with their display names and configurations
export const SUPPORTED_LOCALES = {
  'en-US': {
    name: 'English (US)',
    currency: 'USD',
    timezone: 'America/New_York',
    dateFormat: 'MM/dd/yyyy',
    flag: '🇺🇸'
  },
  'en-GB': {
    name: 'English (UK)',
    currency: 'GBP',
    timezone: 'Europe/London',
    dateFormat: 'dd/MM/yyyy',
    flag: '🇬🇧'
  },
  'en-CA': {
    name: 'English (Canada)',
    currency: 'CAD',
    timezone: 'America/Toronto',
    dateFormat: 'yyyy-MM-dd',
    flag: '🇨🇦'
  },
  'en-AU': {
    name: 'English (Australia)',
    currency: 'AUD',
    timezone: 'Australia/Sydney',
    dateFormat: 'dd/MM/yyyy',
    flag: '🇦🇺'
  },
  'de-DE': {
    name: 'Deutsch (Deutschland)',
    currency: 'EUR',
    timezone: 'Europe/Berlin',
    dateFormat: 'dd.MM.yyyy',
    flag: '🇩🇪'
  },
  'fr-FR': {
    name: 'Français (France)',
    currency: 'EUR',
    timezone: 'Europe/Paris',
    dateFormat: 'dd/MM/yyyy',
    flag: '🇫🇷'
  },
  'es-ES': {
    name: 'Español (España)',
    currency: 'EUR',
    timezone: 'Europe/Madrid',
    dateFormat: 'dd/MM/yyyy',
    flag: '🇪🇸'
  },
  'it-IT': {
    name: 'Italiano (Italia)',
    currency: 'EUR',
    timezone: 'Europe/Rome',
    dateFormat: 'dd/MM/yyyy',
    flag: '🇮🇹'
  },
  'ja-JP': {
    name: '日本語 (日本)',
    currency: 'JPY',
    timezone: 'Asia/Tokyo',
    dateFormat: 'yyyy/MM/dd',
    flag: '🇯🇵'
  },
  'ko-KR': {
    name: '한국어 (대한민국)',
    currency: 'KRW',
    timezone: 'Asia/Seoul',
    dateFormat: 'yyyy.MM.dd',
    flag: '🇰🇷'
  }
} as const;

export type LocaleCode = keyof typeof SUPPORTED_LOCALES;

export interface LocaleConfig {
  name: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  flag: string;
}

export interface LocalizationSettings {
  locale: LocaleCode;
  currency: string;
  timezone: string;
  dateFormat: 'auto' | 'custom';
  customDateFormat?: string;
  timeFormat: '12h' | '24h';
}

interface LocalizationContextType {
  settings: LocalizationSettings;
  updateSettings: (newSettings: Partial<LocalizationSettings>) => Promise<void>;
  getLocaleConfig: (locale?: LocaleCode) => LocaleConfig;
  detectUserLocale: () => LocaleCode;
  loading: boolean;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

const DEFAULT_SETTINGS: LocalizationSettings = {
  locale: 'en-GB', // Default to UK locale as per existing app
  currency: 'GBP',
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
    const browserLocale = navigator.language || navigator.languages?.[0] || 'en-GB';
    
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
      const stored = localStorage.getItem('pluggd_locale_settings');
      if (stored) {
        try {
          const parsedSettings = JSON.parse(stored);
          setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
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
        localStorage.setItem('pluggd_locale_settings', JSON.stringify(detectedSettings));
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
    } finally {
      setLoading(false);
    }
  };

  // Save settings to database or localStorage
  const updateUserSettings = async (newSettings: LocalizationSettings) => {
    if (!user) {
      localStorage.setItem('pluggd_locale_settings', JSON.stringify(newSettings));
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
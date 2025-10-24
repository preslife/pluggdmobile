import type { ReactElement, ReactNode } from "react";
import { vi } from "vitest";
import { render, type RenderOptions } from "@testing-library/react";
import { IntlProvider } from "react-intl";

import enGBMessages from "@/i18n/messages/en-GB.json";
import enUSMessages from "@/i18n/messages/en-US.json";
import esESMessages from "@/i18n/messages/es-ES.json";
import { LocalizationProvider } from "@/contexts/LocalizationContext";
import { DEFAULT_LOCALE, type LocaleCode, SUPPORTED_LOCALES } from "@/lib/locales";

interface LocalizationValue {
  settings: {
    locale: LocaleCode;
    currency: string;
    timezone: string;
    dateFormat: "auto" | "custom";
    timeFormat: "12h" | "24h";
  };
  updateSettings: (newSettings: Partial<LocalizationValue["settings"]>) => Promise<void>;
  getLocaleConfig: (
    locale?: LocaleCode
  ) => (typeof SUPPORTED_LOCALES)[keyof typeof SUPPORTED_LOCALES];
  detectUserLocale: () => LocaleCode;
  loading: boolean;
}

vi.mock("@/contexts/LocalizationContext", async () => {
  const React = await import("react");
  const { SUPPORTED_LOCALES: locales, DEFAULT_LOCALE: defaultLocale } = await vi.importActual<
    typeof import("@/lib/locales")
  >( "@/lib/locales" );

  type Locale = keyof typeof locales;

  const defaultSettings = {
    locale: defaultLocale as LocaleCode,
    currency: locales[defaultLocale].currency,
    timezone: locales[defaultLocale].timezone,
    dateFormat: "auto" as const,
    timeFormat: "24h" as const,
  };

  const LocalizationContext = React.createContext<LocalizationValue>({
    settings: defaultSettings,
    updateSettings: async () => {},
    getLocaleConfig: (locale?: Locale) => locales[locale ?? defaultLocale],
    detectUserLocale: () => defaultLocale,
    loading: false,
  });

  const LocalizationProvider = ({ children, locale }: { children: ReactNode; locale?: Locale }) => {
    const [currentLocale, setCurrentLocale] = React.useState<Locale>(locale ?? defaultLocale);

    React.useEffect(() => {
      if (locale && locales[locale]) {
        setCurrentLocale(locale);
      }
    }, [locale]);

    const value = React.useMemo<LocalizationValue>(() => ({
      settings: {
        locale: currentLocale,
        currency: locales[currentLocale].currency,
        timezone: locales[currentLocale].timezone,
        dateFormat: "auto",
        timeFormat: "24h",
      },
      updateSettings: async (newSettings) => {
        if (newSettings.locale && locales[newSettings.locale as Locale]) {
          setCurrentLocale(newSettings.locale as Locale);
        }
      },
      getLocaleConfig: (localeCode?: Locale) => locales[localeCode ?? currentLocale],
      detectUserLocale: () => currentLocale,
      loading: false,
    }), [currentLocale]);

    return (
      <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>
    );
  };

  const useLocalization = () => React.useContext(LocalizationContext);

  return {
    LocalizationProvider,
    useLocalization,
    SUPPORTED_LOCALES: locales,
    DEFAULT_LOCALE: defaultLocale,
  };
});

const messagesMap: Record<string, Record<string, string>> = {
  "en-GB": enGBMessages,
  "en-US": enUSMessages,
  "es-ES": esESMessages,
};

type RenderWithLocaleOptions = RenderOptions & { locale?: LocaleCode };

export function renderWithLocale(
  ui: ReactElement,
  { locale = DEFAULT_LOCALE, ...options }: RenderWithLocaleOptions = {}
) {
  const messages = messagesMap[locale] ?? messagesMap[DEFAULT_LOCALE];

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <IntlProvider locale={locale} defaultLocale={DEFAULT_LOCALE} messages={messages}>
      {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
      <LocalizationProvider locale={locale}>{children}</LocalizationProvider>
    </IntlProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
}

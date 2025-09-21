# Localization and Internationalization Implementation Guide

This guide provides comprehensive information about the localization system implemented in the Rhythm Flow Verse Hub application.

## 🌍 Overview

The localization system supports:
- **10 locales**: English (US/UK/CA/AU), German, French, Spanish, Italian, Japanese, Korean
- **Multi-currency**: USD, GBP, CAD, AUD, EUR, JPY, KRW
- **Timezone handling**: Automatic detection and custom selection
- **Date/time formatting**: Locale-aware with 12/24 hour formats
- **Translation system**: Key-based with parameter interpolation
- **Fallback mechanisms**: Graceful degradation for unsupported locales

## 🏗️ Architecture

### Core Components

1. **LocalizationContext** (`/src/contexts/LocalizationContext.tsx`)
   - Manages user locale preferences
   - Handles browser locale detection
   - Stores settings in database for authenticated users
   - Falls back to localStorage for anonymous users

2. **Translation System** (`/src/lib/translations.ts`)
   - Key-based translation with nested namespaces
   - Parameter interpolation support
   - Type-safe translation keys
   - English as base language

3. **Formatting Utilities** (`/src/lib/formatting.ts`)
   - Locale-aware date/time formatting
   - Multi-currency support with proper symbols
   - Timezone conversion utilities
   - Number formatting with locale-aware separators

4. **useTranslation Hook** (`/src/hooks/useTranslation.tsx`)
   - Easy access to translations and formatting
   - Automatic locale detection from context
   - Helper functions for common formatting tasks

## 🚀 Usage Examples

### Basic Translation

```tsx
import { useTranslation } from '@/hooks/useTranslation';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('navigation.dashboard')}</h1>
      <p>{t('common.loading')}</p>
    </div>
  );
};
```

### Translation with Parameters

```tsx
const { t } = useTranslation();

// Using parameter interpolation
const message = t('wallet.topUpSuccess', { amount: '100' });
// Result: "Added 100 credits successfully"
```

### Date Formatting

```tsx
import { formatDate } from '@/lib/formatting';
import { useLocalization } from '@/contexts/LocalizationContext';

const DateDisplay = ({ date }) => {
  const { settings } = useLocalization();
  
  const formattedDate = formatDate(date, {
    locale: settings.locale,
    timezone: settings.timezone,
    includeTime: true,
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  
  return <span>{formattedDate}</span>;
};
```

### Currency Formatting

```tsx
import { formatCurrency } from '@/lib/formatting';
import { useTranslation } from '@/hooks/useTranslation';

const PriceDisplay = ({ amount }) => {
  const { currency, locale } = useTranslation();
  
  const formattedPrice = formatCurrency(amount, {
    locale,
    currency,
    minimumFractionDigits: 2
  });
  
  return <span>{formattedPrice}</span>;
};
```

### Relative Time

```tsx
import { formatRelativeTime } from '@/lib/formatting';
import { useLocalization } from '@/contexts/LocalizationContext';

const TimeAgo = ({ timestamp }) => {
  const { settings } = useLocalization();
  
  const relativeTime = formatRelativeTime(timestamp, {
    locale: settings.locale,
    timezone: settings.timezone
  });
  
  return <span>{relativeTime}</span>;
};
```

## 🎛️ Locale Settings Component

Use the `LocaleSettings` component to allow users to change their locale preferences:

```tsx
import { LocaleSettings } from '@/components/LocaleSettings';

const SettingsPage = () => {
  return (
    <div>
      <h1>Settings</h1>
      <LocaleSettings />
    </div>
  );
};
```

## 📝 Adding New Translations

### 1. Add Translation Keys

Edit `/src/lib/translations.ts`:

```typescript
const translations = {
  en: {
    // Add new namespace or keys
    myFeature: {
      title: 'My Feature',
      description: 'This is my new feature',
      action: 'Click here to {{action}}'  // Parameter interpolation
    }
  }
}
```

### 2. Use in Components

```tsx
const MyFeature = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h2>{t('myFeature.title')}</h2>
      <p>{t('myFeature.description')}</p>
      <button>
        {t('myFeature.action', { action: 'continue' })}
      </button>
    </div>
  );
};
```

## 🌐 Adding New Locales

### 1. Update LocalizationContext

Edit `/src/contexts/LocalizationContext.tsx`:

```typescript
export const SUPPORTED_LOCALES = {
  // Existing locales...
  'pt-BR': {
    name: 'Português (Brasil)',
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    dateFormat: 'dd/MM/yyyy',
    flag: '🇧🇷'
  }
} as const;
```

### 2. Add Translation File

Create `/src/lib/translations/pt-BR.ts`:

```typescript
export const ptBR = {
  common: {
    loading: 'Carregando...',
    save: 'Salvar',
    // ... other translations
  },
  // ... other namespaces
};
```

### 3. Update Main Translation File

```typescript
import { ptBR } from './translations/pt-BR';

const translations = {
  en: { /* existing */ },
  'pt-BR': ptBR
} as const;
```

## 🔧 Formatting Options

### Date Formatting Options

```typescript
interface DateFormatOptions {
  locale?: LocaleCode;
  timezone?: string;
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  timeFormat?: '12h' | '24h';
  includeTime?: boolean;
  includeTimezone?: boolean;
  relative?: boolean;
}
```

### Currency Formatting Options

```typescript
interface CurrencyFormatOptions {
  locale?: LocaleCode;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  showCurrency?: boolean;
  compact?: boolean;
}
```

## ⚡ Performance Considerations

1. **Lazy Loading**: Large translation files can be code-split by locale
2. **Memoization**: Translation functions use React.useCallback for performance
3. **Caching**: Formatting results are cached where appropriate
4. **Bundle Size**: Only used translations are included in the final bundle

## 🛠️ Migration Guide

### From date-fns to Localized Formatting

**Before:**
```tsx
import { format } from 'date-fns';

const formatted = format(new Date(), 'PPP at p');
```

**After:**
```tsx
import { formatDate } from '@/lib/formatting';
import { useLocalization } from '@/contexts/LocalizationContext';

const { settings } = useLocalization();
const formatted = formatDate(new Date(), {
  locale: settings.locale,
  timezone: settings.timezone,
  includeTime: true,
  dateStyle: 'long',
  timeStyle: 'short'
});
```

### From Hard-coded Text to Translations

**Before:**
```tsx
<h1>Transaction History</h1>
<p>No transactions found</p>
```

**After:**
```tsx
const { t } = useTranslation();

<h1>{t('wallet.transactionHistory')}</h1>
<p>{t('wallet.noTransactionsFound')}</p>
```

## 🧪 Testing Localization

### Test Different Locales

```tsx
import { LocalizationProvider } from '@/contexts/LocalizationContext';

const TestComponent = () => {
  return (
    <LocalizationProvider 
      defaultSettings={{
        locale: 'de-DE',
        currency: 'EUR',
        timezone: 'Europe/Berlin'
      }}
    >
      <YourComponent />
    </LocalizationProvider>
  );
};
```

### Verify Formatting

```tsx
import { formatCurrency, formatDate } from '@/lib/formatting';

describe('Localization', () => {
  it('formats currency correctly for different locales', () => {
    expect(formatCurrency(1234.56, { locale: 'de-DE', currency: 'EUR' }))
      .toBe('1.234,56 €');
    expect(formatCurrency(1234.56, { locale: 'en-US', currency: 'USD' }))
      .toBe('$1,234.56');
  });
});
```

## 🔍 Debugging

### Check Missing Translations

```tsx
import { getAllTranslationKeys } from '@/lib/translations';

console.log('Available translation keys:', getAllTranslationKeys());
```

### Verify Locale Detection

```tsx
import { useLocalization } from '@/contexts/LocalizationContext';

const DebugLocale = () => {
  const { detectUserLocale, settings } = useLocalization();
  
  console.log('Detected locale:', detectUserLocale());
  console.log('Current settings:', settings);
  
  return null;
};
```

## 🚨 Error Handling

The system includes comprehensive error handling:

1. **Missing Translations**: Falls back to translation key
2. **Invalid Locales**: Falls back to 'en-GB'
3. **Formatting Errors**: Falls back to simple formatting
4. **Network Issues**: Uses localStorage cache

## 📚 Best Practices

1. **Consistent Key Structure**: Use hierarchical namespaces
2. **Descriptive Keys**: Use clear, semantic key names
3. **Parameter Interpolation**: Use `{{param}}` for dynamic content
4. **Context-Aware**: Provide context in translation keys
5. **Testing**: Test all supported locales
6. **Documentation**: Document custom formatting patterns

## 🔮 Future Enhancements

1. **RTL Support**: Right-to-left language support
2. **Pluralization Rules**: Language-specific pluralization
3. **Number Formatting**: Advanced number formatting rules
4. **Dynamic Loading**: Lazy load translation files
5. **Translation Management**: Integration with translation services

This comprehensive localization system provides a solid foundation for international users while maintaining performance and developer experience.
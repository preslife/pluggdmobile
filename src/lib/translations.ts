import { LocaleCode } from '@/contexts/LocalizationContext';

// Translation key type for better type safety
export type TranslationKey = keyof typeof translations.en;

// Nested translation object structure
export interface TranslationNamespace {
  [key: string]: string | TranslationNamespace;
}

// English translations (base language)
const translations = {
  en: {
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      info: 'Information',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      edit: 'Edit',
      delete: 'Delete',
      create: 'Create',
      update: 'Update',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      yes: 'Yes',
      no: 'No',
      and: 'and',
      or: 'or',
      of: 'of',
      at: 'at',
      in: 'in',
      on: 'on',
      by: 'by',
      to: 'to',
      from: 'from',
      preview: 'Preview'
    },
    auth: {
      signIn: 'Sign In',
      signOut: 'Sign Out',
      signUp: 'Sign Up',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      forgotPassword: 'Forgot Password?',
      rememberMe: 'Remember me',
      loginRequired: 'Please sign in to continue',
      invalidCredentials: 'Invalid email or password',
      passwordsDoNotMatch: 'Passwords do not match',
      accountCreated: 'Account created successfully',
      passwordReset: 'Password reset email sent',
      signInWithGoogle: 'Sign in with Google',
      signInWithGitHub: 'Sign in with GitHub'
    },
    navigation: {
      home: 'Home',
      marketplace: 'Marketplace',
      library: 'Library',
      tools: 'Tools',
      education: 'Education',
      community: 'Community',
      dashboard: 'Dashboard',
      profile: 'Profile',
      settings: 'Settings',
      help: 'Help',
      about: 'About',
      contact: 'Contact'
    },
    wallet: {
      balance: 'Balance',
      credits: 'Credits',
      topUp: 'Top Up',
      cashOut: 'Cash Out',
      transaction: 'Transaction',
      transactionHistory: 'Transaction History',
      amount: 'Amount',
      date: 'Date',
      type: 'Type',
      status: 'Status',
      pending: 'Pending',
      completed: 'Completed',
      failed: 'Failed',
      insufficientCredits: 'Insufficient credits',
      topUpSuccess: 'Credits added successfully',
      cashOutSuccess: 'Cash-out requested successfully',
      transactionFailed: 'Transaction failed',
      creditsApplied: 'Credits applied to subscription',
      tipSent: 'Tip Sent',
      purchase: 'Purchase',
      battleEntry: 'Battle Entry',
      prizeAwarded: 'Prize Awarded',
      conversion: 'Conversion',
      refresh: 'Refresh',
      clearFilters: 'Clear filters',
      noTransactionsFound: 'No transactions found'
    },
    releases: {
      title: 'Title',
      artist: 'Artist',
      releaseDate: 'Release Date',
      genre: 'Genre',
      duration: 'Duration',
      plays: 'Plays',
      likes: 'Likes',
      downloads: 'Downloads',
      price: 'Price',
      free: 'Free',
      premium: 'Premium',
      exclusive: 'Exclusive',
      newRelease: 'New Release',
      featuredArtist: 'Featured Artist',
      albumArt: 'Album Art',
      trackList: 'Track List',
      credits: 'Credits',
      description: 'Description',
      tags: 'Tags'
    },
    marketplace: {
      beats: 'Beats',
      samples: 'Samples',
      presets: 'Presets',
      merchandise: 'Merchandise',
      services: 'Services',
      featured: 'Featured',
      trending: 'Trending',
      newArrivals: 'New Arrivals',
      onSale: 'On Sale',
      category: 'Category',
      priceRange: 'Price Range',
      bpm: 'BPM',
      key: 'Key',
      mood: 'Mood',
      instrument: 'Instrument',
      addToCart: 'Add to Cart',
      buyNow: 'Buy Now',
      preview: 'Preview',
      download: 'Download',
      license: 'License',
      exclusive: 'Exclusive Rights',
      nonExclusive: 'Non-Exclusive Rights'
    },
    settings: {
      general: 'General',
      account: 'Account',
      privacy: 'Privacy',
      notifications: 'Notifications',
      language: 'Language',
      currency: 'Currency',
      timezone: 'Timezone',
      dateFormat: 'Date Format',
      timeFormat: 'Time Format',
      theme: 'Theme',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
      systemDefault: 'System Default',
      emailNotifications: 'Email Notifications',
      pushNotifications: 'Push Notifications',
      marketingEmails: 'Marketing Emails',
      autoDetect: 'Auto Detect',
      custom: 'Custom',
      twelveHour: '12 Hour',
      twentyFourHour: '24 Hour'
    },
    dates: {
      today: 'Today',
      yesterday: 'Yesterday',
      tomorrow: 'Tomorrow',
      thisWeek: 'This Week',
      lastWeek: 'Last Week',
      thisMonth: 'This Month',
      lastMonth: 'Last Month',
      thisYear: 'This Year',
      lastYear: 'Last Year',
      justNow: 'Just now',
      minutesAgo: 'minutes ago',
      hoursAgo: 'hours ago',
      daysAgo: 'days ago',
      weeksAgo: 'weeks ago',
      monthsAgo: 'months ago',
      yearsAgo: 'years ago'
    },
    errors: {
      networkError: 'Network error. Please check your connection.',
      serverError: 'Server error. Please try again later.',
      unauthorized: 'You are not authorized to perform this action.',
      notFound: 'The requested resource was not found.',
      validationError: 'Please check your input and try again.',
      unknownError: 'An unknown error occurred.',
      sessionExpired: 'Your session has expired. Please sign in again.',
      maintenanceMode: 'The system is currently under maintenance.'
    },
    success: {
      saved: 'Changes saved successfully',
      updated: 'Updated successfully',
      created: 'Created successfully',
      deleted: 'Deleted successfully',
      uploaded: 'File uploaded successfully',
      downloaded: 'Download completed',
      emailSent: 'Email sent successfully',
      passwordChanged: 'Password changed successfully',
      profileUpdated: 'Profile updated successfully'
    }
  }
} as const;

// Type for the translation object
type TranslationObject = typeof translations.en;

/**
 * Get nested translation value from key path
 */
function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}

/**
 * Get translation for a given key and locale
 * @param key - Translation key (e.g., 'auth.signIn' or 'common.loading')
 * @param locale - Locale code (defaults to 'en')
 * @param params - Parameters for string interpolation
 */
export function t(
  key: string,
  locale: string = 'en',
  params?: Record<string, string | number>
): string {
  // For now, all locales fall back to English
  // In the future, you can add locale-specific translations
  const localeTranslations = translations.en;
  
  const translation = getNestedValue(localeTranslations, key);
  
  if (!translation) {
    console.warn(`Missing translation for key: ${key}`);
    return key; // Return the key itself as fallback
  }

  // Simple parameter interpolation
  if (params) {
    return Object.entries(params).reduce((text, [param, value]) => {
      return text.replace(new RegExp(`{{${param}}}`, 'g'), String(value));
    }, translation);
  }

  return translation;
}

/**
 * Check if a translation key exists
 */
export function hasTranslation(key: string, locale: string = 'en'): boolean {
  const localeTranslations = translations.en;
  return getNestedValue(localeTranslations, key) !== null;
}

/**
 * Get all available translation keys for debugging
 */
export function getAllTranslationKeys(obj = translations.en, prefix = ''): string[] {
  let keys: string[] = [];
  
  Object.keys(obj).forEach(key => {
    const currentKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key as keyof typeof obj];
    
    if (typeof value === 'string') {
      keys.push(currentKey);
    } else if (typeof value === 'object' && value !== null) {
      keys = keys.concat(getAllTranslationKeys(value as any, currentKey));
    }
  });
  
  return keys;
}

/**
 * Pluralization helper
 */
export function plural(
  count: number,
  singular: string,
  plural: string,
  locale: string = 'en'
): string {
  // Simple English pluralization rules
  // For other languages, you'd implement more complex rules
  return count === 1 ? singular : plural;
}

/**
 * Format number with locale-aware thousand separators
 */
export function formatNumber(value: number, locale: string = 'en-GB'): string {
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch (error) {
    console.warn('Number formatting error:', error);
    return value.toString();
  }
}

// Export translations for direct access
export { translations };
export default translations;
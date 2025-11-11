import type { LocaleCode } from '@/lib/locales';

export const baseTranslation = {
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
  pages: {
    education: {
      heading: 'My Learning Dashboard',
      subheading: 'Continue your journey to mastery',
      adminButton: 'Admin Panel',
      upgradeButton: 'Upgrade to Pro',
      stats: {
        active: 'Active Courses',
        completed: 'Completed',
        hoursLearned: 'Hours Learned',
        streak: 'Current Streak'
      }
    },
    wallet: {
      heading: 'Wallet',
      complianceTitle: 'Compliance notice',
      complianceDescription:
        'PLGD Credits are a limited-purpose digital balance. They are non-transferable, do not earn interest, and are not insured deposits.',
      headingBadge: 'Wallet overview'
    },
    live: {
      heroTagline: 'Get Plugged In',
      heroTitle: 'Live Battles, Showcases, and Creator Streams',
      heroSubtitle:
        'The energy of the culture in real-time. Submit, perform, and get feedback from the community.',
      ctaJoinSession: 'Join a Session',
      ctaViewBattles: 'View Battles',
      ctaJoinCommunity: 'Join the Community',
      ctaViewSessions: 'View Sessions',
      scheduleHeading: 'Upcoming Schedule',
      scheduleEmpty: 'No upcoming events right now. Check back soon!',
      statusLiveNow: 'Live now',
      statusStartingSoon: 'Starting soon',
      statusScheduleTba: 'Schedule TBA',
      statusEndsIn: 'Ends {{time}}',
      statusStartsIn: 'Starts {{time}}',
      actionJoinSession: 'Join Session',
      actionViewSession: 'View Session',
      actionWatchBattle: 'Watch Battle',
      actionViewBattle: 'View Battle',
      liveRoomsHeading: 'Live Rooms',
      viewAllSessions: 'View all sessions',
      joinLiveRoom: 'Join live room'
    },
    messaging: {
      heading: 'Unified Inbox',
      description: 'Manage conversations from your connected channels in one place.',
      filtersTitle: 'Filters',
      providerPlaceholder: 'All providers'
    }
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
  },
  messaging: {
    title: 'Messages',
    searchPlaceholder: 'Search inbox...',
    loadingConversations: 'Loading conversations...',
    emptyState: 'No conversations yet',
    loading: 'Loading...',
    loadMore: 'Load more',
    threadFallback: 'Inbox',
    threadHeaderFallback: 'Inbox thread',
    authorPrefix: '{{author}}: ',
    badgeOverflow: '{{count}}+',
    loadPreviousMessages: 'Load previous messages',
    loadingMessages: 'Loading messages...',
    optimisticStatus: ' • sending',
    composerPlaceholder: 'Type a message...',
    emptyThreadState: 'Select a conversation to start messaging'
  }
} as const;

export const walletTranslation = {
  auth: {
    title: 'Access Required',
    signInPrompt: 'Please sign in to access your wallet.'
  },
  header: {
    title: 'Wallet',
    compliance: {
      title: 'Compliance notice',
      description:
        'PLGD Credits are a limited-purpose digital balance. They are non-transferable, do not earn interest, and are not insured deposits.',
      bulletPoints: {
        holdPeriod: 'Available credits exclude pending top ups for the first 48 hours to mitigate chargebacks.',
        refunds: 'Refunds create reversing ledger entries so that buyer, seller, and platform balances stay aligned.',
        disputes:
          'Contact support@pluggd.io for ledger disputes. Statements are retained for statutory anti-money laundering audits.'
      }
    }
  },
  balances: {
    total: {
      label: 'Total Balance',
      helper: 'Total balance'
    },
    available: {
      label: 'Available',
      helper: 'Ready to spend'
    },
    pending: {
      label: 'Pending',
      helper: 'Available in 48h'
    }
  },
  ledger: {
    title: 'Ledger snapshot',
    description: {
      withEntries: 'Based on your last {{count}} ledger {{entryLabel}}.',
      empty: 'No ledger activity recorded yet.'
    },
    descriptionLabels: {
      entry: 'entry',
      entries: 'entries'
    },
    summary: {
      creditsAdded: 'Credits added',
      creditsSpent: 'Credits spent',
      netMovement: 'Net movement',
      lastTransaction: 'Last transaction',
      noActivity: 'No activity captured yet.',
      placeholder: 'Once you start topping up or spending credits we’ll summarise the movement here.'
    }
  },
  tabs: {
    overview: 'Overview',
    activity: 'Activity',
    topUp: 'Top Up',
    cashOut: 'Cash Out'
  },
  overview: {
    quickActions: {
      title: 'Quick Actions',
      description: 'Top up your wallet or manage your credits',
      buy: 'Buy {{amount}}',
      applySubscription: {
        label: 'Apply to subscription',
        helper: '{{amount}} credits',
        alert: 'You need at least 1,000 credits (£10) to apply to subscription.'
      }
    },
    accountStatus: {
      title: 'Account Status',
      description: 'Your current wallet and account information',
      accountType: {
        label: 'Account Type',
        free: 'Free'
      },
      totalCredits: 'Total Credits',
      availableCredits: 'Available Credits',
      pendingCredits: 'Pending Credits'
    },
    recentActivity: {
      title: 'Recent Activity',
      description: 'Your latest wallet transactions',
      items: {
        topUp: {
          title: 'Top-up',
          timeAgo: '2 days ago'
        },
        purchase: {
          title: 'Beat Purchase',
          timeAgo: '3 days ago'
        }
      },
      viewAll: 'View all activity →'
    }
  },
  topUp: {
    errors: {
      invalidAmount: 'Invalid amount'
    },
    packages: {
      title: 'Credit Packages',
      description: 'Choose a credit package that suits your needs',
      popular: 'Popular',
      card: {
        title: '{{amount}} Credits',
        value: '{{credits}} credits per {{currency}}',
        cta: 'Buy Now'
      }
    },
    custom: {
      title: 'Custom Amount',
      description: 'Enter a custom amount of credits to purchase',
      placeholder: 'Enter credits amount',
      limits: 'Minimum: {{min}} credits ({{minCurrency}}) | Maximum: {{max}} credits ({{maxCurrency}})',
      summary: {
        credits: 'credits',
        connector: 'for'
      },
      purchaseButton: 'Purchase Custom Amount'
    },
    share: {
      title: 'Share & Earn Free Credits',
      description: 'Invite friends and earn credits when they join and make purchases',
      perks: {
        signup: '💰 {{credits}} credits ({{reward}}) for each friend signup',
        purchase: '🎯 {{credits}} credits ({{reward}}) when they make their first £5+ purchase',
        subscription: '🚀 {{credits}} credits ({{reward}}) each when they start a subscription'
      },
      shareTitle: 'Join me on Pluggd and get free credits!',
      shareDescription: 'Sign up and we both get bonus credits to spend on beats and more!',
      button: 'Share & Earn Credits'
    }
  },
  cashOut: {
    eligibility: {
      notice:
        'You need at least {{minimumCredits}} ({{minimumCurrency}}) to cash out. Your current available balance is {{availableCredits}}.'
    },
    setup: {
      title: 'Payment Setup',
      accountTitle: 'Stripe Connect Account',
      accountStatus: 'Connected and verified',
      processing: 'Cash-outs are processed within 3-5 business days to your connected bank account.'
    },
    form: {
      title: 'Cash Out Credits',
      description: 'Convert your credits to GBP and transfer to your bank account',
      amountLabel: 'Amount to cash out',
      placeholder: 'Minimum {{minimumCredits}}',
      available: 'Available: {{availableCredits}}',
      processing: 'Processing...',
      submit: 'Cash Out {{amount}}'
    },
    summary: {
      title: 'Cash-out Summary',
      creditsLabel: 'Credits to convert:',
      grossLabel: 'Gross amount:',
      commissionLabel: 'Platform commission ({{rate}}):',
      netLabel: 'Net amount:'
    },
    disclaimers: {
      minimum: '• Minimum cash-out: {{minimumCurrency}}',
      timeline: '• Processing time: 3-5 business days',
      commission: '• Commission rates vary by subscription tier',
      confirmation: "• You'll receive an email confirmation once processed"
    },
    history: {
      title: 'Recent Cash-outs',
      description: 'Your cash-out history and status',
      items: {
        completed: {
          title: 'Cash-out',
          subtitle: 'Completed • Dec 15, 2024',
          status: 'Paid'
        },
        processing: {
          title: 'Cash-out',
          subtitle: 'Processing • Dec 18, 2024',
          status: 'Pending'
        }
      }
    }
  },
  activity: {
    filter: {
      title: 'Filter activity',
      placeholder: 'Filter by type',
      all: 'All transactions'
    },
    searchPlaceholder: 'Search transactions',
    history: {
      title: 'Transaction history',
      description: 'Track every wallet credit and debit',
      empty: 'No transactions found',
      clear: 'Clear filters',
      refresh: 'Refresh'
    },
    descriptions: {
      tipSent: 'Tip sent',
      purchase: '{{refType}} purchase',
      battleEntry: 'Battle entry',
      prizeAwarded: '{{refType}} prize awarded'
    },
    labels: {
      genericTransaction: 'Transaction',
      unknown: 'Other ({{kind}})'
    }
  },
  actions: {
    topUp: 'Top Up',
    tipSent: 'Tip Sent',
    purchase: 'Purchase',
    battleEntry: 'Battle Entry',
    prizeAwarded: 'Prize Awarded',
    cashOut: 'Cash Out',
    creditsApplied: 'Credits applied to subscription'
  }
} as const;

export type TranslationShape = typeof baseTranslation;
export type WalletTranslationShape = typeof walletTranslation;
export type TranslationOverrides = Partial<TranslationShape>;
export type WalletTranslationOverrides = Partial<WalletTranslationShape>;

type TranslationResource = {
  translation: TranslationShape;
  wallet: WalletTranslationShape;
};

const cloneBase = (): TranslationShape =>
  JSON.parse(JSON.stringify(baseTranslation)) as TranslationShape;

const cloneWalletBase = (): WalletTranslationShape =>
  JSON.parse(JSON.stringify(walletTranslation)) as WalletTranslationShape;

const applyOverrides = (target: any, source: any) => {
  Object.keys(source).forEach(key => {
    const value = source[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key]) {
        target[key] = {};
      }
      applyOverrides(target[key], value);
    } else {
      target[key] = value;
    }
  });
};

const createResource = (
  overrides?: TranslationOverrides,
  walletOverrides?: WalletTranslationOverrides
): TranslationResource => {
  const merged = cloneBase();
  if (overrides) {
    applyOverrides(merged, overrides);
  }

  const walletMerged = cloneWalletBase();
  if (walletOverrides) {
    applyOverrides(walletMerged, walletOverrides);
  }

  return { translation: merged, wallet: walletMerged };
};

const deOverrides: TranslationOverrides = {
  common: {
    loading: 'Lädt...',
    error: 'Fehler',
    success: 'Erfolg',
    warning: 'Warnung',
    info: 'Info',
    cancel: 'Abbrechen',
    confirm: 'Bestätigen',
    save: 'Speichern',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    create: 'Erstellen',
    update: 'Aktualisieren',
    search: 'Suchen',
    filter: 'Filtern',
    sort: 'Sortieren',
    close: 'Schließen',
    back: 'Zurück',
    next: 'Weiter',
    previous: 'Vorherige',
    yes: 'Ja',
    no: 'Nein',
    and: 'und',
    or: 'oder',
    of: 'von',
    at: 'um',
    in: 'in',
    on: 'am',
    by: 'von',
    to: 'bis',
    from: 'von',
    preview: 'Vorschau',
  },
  navigation: {
    home: 'Startseite',
    marketplace: 'Marktplatz',
    library: 'Bibliothek',
    tools: 'Tools',
    education: 'Lernen',
    community: 'Community',
    dashboard: 'Dashboard',
    profile: 'Profil',
    settings: 'Einstellungen',
    help: 'Hilfe',
    about: 'Über uns',
    contact: 'Kontakt',
  },
  releases: {
    title: 'Titel',
    artist: 'Künstler',
    releaseDate: 'Veröffentlichungsdatum',
    genre: 'Genre',
    duration: 'Dauer',
    plays: 'Plays',
    likes: 'Gefällt mir',
    downloads: 'Downloads',
    price: 'Preis',
    free: 'Gratis',
    premium: 'Premium',
    exclusive: 'Exklusiv',
    newRelease: 'Neue Veröffentlichung',
    featuredArtist: 'Gastkünstler',
    albumArt: 'Albumcover',
    trackList: 'Trackliste',
    credits: 'Credits',
    description: 'Beschreibung',
    tags: 'Tags',
  },
  marketplace: {
    beats: 'Beats',
    samples: 'Samples',
    presets: 'Presets',
    merchandise: 'Merch',
    services: 'Services',
    featured: 'Highlights',
    trending: 'Trends',
    newArrivals: 'Neu eingetroffen',
    onSale: 'Im Angebot',
    category: 'Kategorie',
    priceRange: 'Preisbereich',
    bpm: 'BPM',
    key: 'Tonart',
    mood: 'Stimmung',
    instrument: 'Instrument',
    addToCart: 'In den Warenkorb',
    buyNow: 'Jetzt kaufen',
    preview: 'Anhören',
    download: 'Download',
    license: 'Lizenz',
    exclusive: 'Exklusive Rechte',
    nonExclusive: 'Nicht-exklusive Rechte',
  },
  settings: {
    general: 'Allgemein',
    account: 'Konto',
    privacy: 'Datenschutz',
    notifications: 'Benachrichtigungen',
    language: 'Sprache',
    currency: 'Währung',
    timezone: 'Zeitzone',
    dateFormat: 'Datumsformat',
    timeFormat: 'Zeitformat',
    theme: 'Theme',
    darkMode: 'Dunkel',
    lightMode: 'Hell',
    systemDefault: 'Systemstandard',
    emailNotifications: 'E-Mail-Benachrichtigungen',
    pushNotifications: 'Push-Benachrichtigungen',
    marketingEmails: 'Marketing-E-Mails',
    autoDetect: 'Automatisch erkennen',
    custom: 'Benutzerdefiniert',
    twelveHour: '12-Stunden',
    twentyFourHour: '24-Stunden',
  },
  pages: {
    education: {
      heading: 'Mein Lern-Dashboard',
      subheading: 'Setze deine Reise zur Meisterschaft fort',
      adminButton: 'Admin-Bereich',
      upgradeButton: 'Upgrade auf Pro',
      stats: {
        active: 'Aktive Kurse',
        completed: 'Abgeschlossen',
        hoursLearned: 'Gelernt (Std.)',
        streak: 'Aktuelle Serie',
      },
    },
    wallet: {
      heading: 'Wallet',
      complianceTitle: 'Hinweis zur Compliance',
      complianceDescription:
        'PLGD Credits sind ein zweckgebundenes digitales Guthaben. Sie sind nicht übertragbar, werden nicht verzinst und sind keine versicherten Einlagen.',
      headingBadge: 'Wallet-Übersicht',
    },
    live: {
      heroTagline: 'Get Plugged In',
      heroTitle: 'Live-Battles, Showcases und Streams',
      heroSubtitle:
        'Die Energie der Kultur in Echtzeit. Reiche ein, performe und erhalte Feedback von der Community.',
      ctaJoinSession: 'Session beitreten',
      ctaViewBattles: 'Battles ansehen',
      ctaJoinCommunity: 'Community beitreten',
      ctaViewSessions: 'Sessions anzeigen',
      scheduleHeading: 'Bevorstehender Zeitplan',
      scheduleEmpty: 'Zurzeit keine Events. Schau bald wieder vorbei!',
      statusLiveNow: 'Jetzt live',
      statusStartingSoon: 'Startet bald',
      statusScheduleTba: 'Zeitplan folgt',
      statusEndsIn: 'Endet in {{time}}',
      statusStartsIn: 'Beginnt in {{time}}',
      actionJoinSession: 'Session beitreten',
      actionViewSession: 'Session ansehen',
      actionWatchBattle: 'Battle ansehen',
      actionViewBattle: 'Battle anzeigen',
      liveRoomsHeading: 'Live-Räume',
      viewAllSessions: 'Alle Sessions ansehen',
      joinLiveRoom: 'Live-Raum betreten',
    },
    messaging: {
      heading: 'Zentraler Posteingang',
      description: 'Verwalte deine Gespräche an einem Ort.',
      filtersTitle: 'Filter',
      providerPlaceholder: 'Alle Anbieter',
    },
  },
};

const deWalletOverrides: WalletTranslationOverrides = {
  auth: {
    title: 'Zugriff erforderlich',
    signInPrompt: 'Bitte melde dich an, um auf dein Wallet zuzugreifen.',
  },
  header: {
    title: 'Wallet',
    compliance: {
      title: 'Hinweis zur Compliance',
      description:
        'PLGD Credits sind ein zweckgebundenes digitales Guthaben. Sie sind nicht übertragbar, werden nicht verzinst und sind keine versicherten Einlagen.',
      bulletPoints: {
        holdPeriod: 'Verfügbare Credits schließen schwebende Aufladungen in den ersten 48 Stunden aus, um Rückbuchungen zu vermeiden.',
        refunds: 'Rückerstattungen erzeugen gegenläufige Buchungen, damit Käufer-, Verkäufer- und Plattformkonten übereinstimmen.',
        disputes:
          'Kontaktiere support@pluggd.io bei Streitfällen. Kontoauszüge werden für gesetzliche AML-Prüfungen aufbewahrt.',
      },
    },
  },
  balances: {
    total: {
      label: 'Gesamtsaldo',
      helper: 'Gesamtsaldo',
    },
    available: {
      label: 'Verfügbar',
      helper: 'Sofort nutzbar',
    },
    pending: {
      label: 'Ausstehend',
      helper: 'In 48 Std. verfügbar',
    },
  },
  ledger: {
    title: 'Ledger-Übersicht',
    description: {
      withEntries: 'Basierend auf deinen letzten {{count}} {{entryLabel}}.',
      empty: 'Noch keine Bewegungen im Ledger.',
    },
    descriptionLabels: {
      entry: 'Eintrag',
      entries: 'Einträge',
    },
    summary: {
      creditsAdded: 'Credits gutgeschrieben',
      creditsSpent: 'Credits ausgegeben',
      netMovement: 'Netto-Bewegung',
      lastTransaction: 'Letzte Transaktion',
      noActivity: 'Noch keine Aktivität vorhanden.',
      placeholder: 'Sobald du Credits auflädst oder ausgibst, fassen wir die Bewegungen hier zusammen.',
    },
  },
  tabs: {
    overview: 'Übersicht',
    activity: 'Aktivität',
    topUp: 'Aufladen',
    cashOut: 'Auszahlen',
  },
  overview: {
    quickActions: {
      title: 'Schnellaktionen',
      description: 'Lade dein Wallet auf oder verwalte deine Credits',
      buy: '{{amount}} kaufen',
      applySubscription: {
        label: 'Für Abo verwenden',
        helper: '{{amount}} Credits',
        alert: 'Mindestens 1.000 Credits (£10) erforderlich, um ein Abo zu bezahlen.',
      },
    },
    accountStatus: {
      title: 'Kontostatus',
      description: 'Aktuelle Wallet- und Kontoinformationen',
      accountType: {
        label: 'Kontotyp',
        free: 'Kostenlos',
      },
      totalCredits: 'Credits gesamt',
      availableCredits: 'Verfügbare Credits',
      pendingCredits: 'Ausstehende Credits',
    },
    recentActivity: {
      title: 'Letzte Aktivität',
      description: 'Deine neuesten Wallet-Transaktionen',
      items: {
        topUp: {
          title: 'Aufladung',
          timeAgo: 'Vor 2 Tagen',
        },
        purchase: {
          title: 'Beat-Kauf',
          timeAgo: 'Vor 3 Tagen',
        },
      },
      viewAll: 'Alle Aktivitäten ansehen →',
    },
  },
  topUp: {
    errors: {
      invalidAmount: 'Ungültiger Betrag',
    },
    packages: {
      title: 'Credit-Pakete',
      description: 'Wähle das Paket, das am besten zu dir passt',
      popular: 'Beliebt',
      card: {
        title: '{{amount}} Credits',
        value: '{{credits}} Credits pro {{currency}}',
        cta: 'Jetzt kaufen',
      },
    },
    custom: {
      title: 'Eigener Betrag',
      description: 'Gib die Anzahl der Credits ein, die du kaufen möchtest',
      placeholder: 'Credits-Betrag eingeben',
      limits: 'Minimum: {{min}} Credits ({{minCurrency}}) | Maximum: {{max}} Credits ({{maxCurrency}})',
      summary: {
        credits: 'Credits',
        connector: 'für',
      },
      purchaseButton: 'Eigenen Betrag kaufen',
    },
    share: {
      title: 'Teilen & kostenlose Credits verdienen',
      description: 'Freunde einladen und Credits verdienen, wenn sie beitreten und kaufen',
      perks: {
        signup: '💰 {{credits}} Credits ({{reward}}) für jede Registrierung eines Freundes',
        purchase: '🎯 {{credits}} Credits ({{reward}}), wenn sie ihren ersten Kauf über £5 tätigen',
        subscription: '🚀 {{credits}} Credits ({{reward}}) für euch beide, wenn sie ein Abo starten',
      },
      shareTitle: 'Komm zu Pluggd und sichere dir kostenlose Credits!',
      shareDescription: 'Registriere dich und wir erhalten beide Bonus-Credits für Beats und mehr.',
      button: 'Teilen & Credits verdienen',
    },
  },
  cashOut: {
    eligibility: {
      notice:
        'Du benötigst mindestens {{minimumCredits}} ({{minimumCurrency}}) für eine Auszahlung. Dein verfügbares Guthaben beträgt {{availableCredits}}.',
    },
    setup: {
      title: 'Auszahlungs-Einrichtung',
      accountTitle: 'Stripe-Connect-Konto',
      accountStatus: 'Verbunden und verifiziert',
      processing: 'Auszahlungen werden innerhalb von 3–5 Werktagen auf dein Bankkonto überwiesen.',
    },
    form: {
      title: 'Credits auszahlen',
      description: 'Wandle Credits in GBP um und überweise sie auf dein Bankkonto',
      amountLabel: 'Auszahlungsbetrag',
      placeholder: 'Mindestens {{minimumCredits}}',
      available: 'Verfügbar: {{availableCredits}}',
      processing: 'Wird verarbeitet...',
      submit: '{{amount}} auszahlen',
    },
    summary: {
      title: 'Auszahlungsübersicht',
      creditsLabel: 'Credits zur Umwandlung:',
      grossLabel: 'Bruttobetrag:',
      commissionLabel: 'Plattformgebühr ({{rate}}):',
      netLabel: 'Nettobetrag:',
    },
    disclaimers: {
      minimum: '• Mindest-Auszahlung: {{minimumCurrency}}',
      timeline: '• Bearbeitungszeit: 3–5 Werktage',
      commission: '• Gebühren variieren je nach Abostufe',
      confirmation: '• Du erhältst eine E-Mail-Bestätigung nach Abschluss',
    },
    history: {
      title: 'Kürzliche Auszahlungen',
      description: 'Verlauf und Status deiner Auszahlungen',
      items: {
        completed: {
          title: 'Auszahlung',
          subtitle: 'Abgeschlossen • 15. Dez. 2024',
          status: 'Ausgezahlt',
        },
        processing: {
          title: 'Auszahlung',
          subtitle: 'In Bearbeitung • 18. Dez. 2024',
          status: 'Ausstehend',
        },
      },
    },
  },
  activity: {
    filter: {
      title: 'Aktivität filtern',
      placeholder: 'Nach Typ filtern',
      all: 'Alle Transaktionen',
    },
    searchPlaceholder: 'Transaktionen suchen',
    history: {
      title: 'Transaktionsverlauf',
      description: 'Verfolge jede Gutschrift und Belastung deines Wallets',
      empty: 'Keine Transaktionen gefunden',
      clear: 'Filter zurücksetzen',
      refresh: 'Aktualisieren',
    },
    descriptions: {
      tipSent: 'Trinkgeld gesendet',
      purchase: '{{refType}}-Kauf',
      battleEntry: 'Battle-Anmeldung',
      prizeAwarded: '{{refType}}-Preis vergeben',
    },
    labels: {
      genericTransaction: 'Transaktion',
      unknown: 'Sonstiges ({{kind}})',
    },
  },
  actions: {
    topUp: 'Aufladen',
    tipSent: 'Trinkgeld gesendet',
    purchase: 'Kauf',
    battleEntry: 'Battle-Beitrag',
    prizeAwarded: 'Preis vergeben',
    cashOut: 'Auszahlung',
    creditsApplied: 'Credits auf Abo angewendet',
  },
};

const frOverrides: TranslationOverrides = {
  common: {
    loading: 'Chargement…',
    error: 'Erreur',
    success: 'Succès',
    warning: 'Avertissement',
    info: 'Info',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    save: 'Enregistrer',
    edit: 'Modifier',
    delete: 'Supprimer',
    create: 'Créer',
    update: 'Mettre à jour',
    search: 'Rechercher',
    filter: 'Filtrer',
    sort: 'Trier',
    close: 'Fermer',
    back: 'Retour',
    next: 'Suivant',
    previous: 'Précédent',
    yes: 'Oui',
    no: 'Non',
    and: 'et',
    or: 'ou',
    of: 'de',
    at: 'à',
    in: 'dans',
    on: 'le',
    by: 'par',
    to: 'vers',
    from: 'depuis',
    preview: 'Prévisualiser',
  },
  navigation: {
    home: 'Accueil',
    marketplace: 'Marketplace',
    library: 'Bibliothèque',
    tools: 'Outils',
    education: 'Formation',
    community: 'Communauté',
    dashboard: 'Tableau de bord',
    profile: 'Profil',
    settings: 'Paramètres',
    help: 'Aide',
    about: 'À propos',
    contact: 'Contact',
  },
  releases: {
    title: 'Titre',
    artist: 'Artiste',
    releaseDate: 'Date de sortie',
    genre: 'Genre',
    duration: 'Durée',
    plays: 'Lectures',
    likes: 'J\'aime',
    downloads: 'Téléchargements',
    price: 'Prix',
    free: 'Gratuit',
    premium: 'Premium',
    exclusive: 'Exclusif',
    newRelease: 'Nouvelle sortie',
    featuredArtist: 'Artiste invité',
    albumArt: 'Pochette',
    trackList: 'Liste des titres',
    credits: 'Crédits',
    description: 'Description',
    tags: 'Tags',
  },
  marketplace: {
    beats: 'Beats',
    samples: 'Samples',
    presets: 'Presets',
    merchandise: 'Merchandising',
    services: 'Services',
    featured: 'À la une',
    trending: 'Tendance',
    newArrivals: 'Nouveautés',
    onSale: 'En promotion',
    category: 'Catégorie',
    priceRange: 'Fourchette de prix',
    bpm: 'BPM',
    key: 'Tonalité',
    mood: 'Ambiance',
    instrument: 'Instrument',
    addToCart: 'Ajouter au panier',
    buyNow: 'Acheter maintenant',
    preview: 'Préécoute',
    download: 'Télécharger',
    license: 'Licence',
    exclusive: 'Droits exclusifs',
    nonExclusive: 'Droits non exclusifs',
  },
  settings: {
    general: 'Général',
    account: 'Compte',
    privacy: 'Confidentialité',
    notifications: 'Notifications',
    language: 'Langue',
    currency: 'Devise',
    timezone: 'Fuseau horaire',
    dateFormat: 'Format de date',
    timeFormat: 'Format de l\'heure',
    theme: 'Thème',
    darkMode: 'Sombre',
    lightMode: 'Clair',
    systemDefault: 'Système',
    emailNotifications: 'Notifications e-mail',
    pushNotifications: 'Notifications push',
    marketingEmails: 'E-mails marketing',
    autoDetect: 'Détection automatique',
    custom: 'Personnalisé',
    twelveHour: '12 heures',
    twentyFourHour: '24 heures',
  },
  pages: {
    education: {
      heading: 'Mon tableau d\'apprentissage',
      subheading: 'Continue ton parcours vers l\'excellence',
      adminButton: 'Panneau d\'administration',
      upgradeButton: 'Passer en Pro',
      stats: {
        active: 'Cours actifs',
        completed: 'Terminés',
        hoursLearned: 'Heures apprises',
        streak: 'Série en cours',
      },
    },
    wallet: {
      heading: 'Portefeuille',
      complianceTitle: 'Note de conformité',
      complianceDescription:
        'Les crédits PLGD sont un solde numérique à usage limité. Ils ne sont pas transférables, ne génèrent pas d\'intérêt et ne sont pas des dépôts assurés.',
      headingBadge: 'Vue d\'ensemble du portefeuille',
    },
    live: {
      heroTagline: 'Get Plugged In',
      heroTitle: 'Battles, showcases et streams en direct',
      heroSubtitle:
        'Toute l\'énergie de la culture en temps réel. Propose ton son, joue et reçois les retours de la communauté.',
      ctaJoinSession: 'Rejoindre une session',
      ctaViewBattles: 'Voir les battles',
      ctaJoinCommunity: 'Rejoindre la communauté',
      ctaViewSessions: 'Voir les sessions',
      scheduleHeading: 'Prochaines sessions',
      scheduleEmpty: 'Aucun événement à venir pour le moment. Reviens bientôt !',
      statusLiveNow: 'En direct',
      statusStartingSoon: 'Démarre bientôt',
      statusScheduleTba: 'Programme à venir',
      statusEndsIn: 'Se termine dans {{time}}',
      statusStartsIn: 'Commence dans {{time}}',
      actionJoinSession: 'Rejoindre',
      actionViewSession: 'Voir la session',
      actionWatchBattle: 'Regarder la battle',
      actionViewBattle: 'Voir la battle',
      liveRoomsHeading: 'Salles en direct',
      viewAllSessions: 'Voir toutes les sessions',
      joinLiveRoom: 'Entrer dans la salle',
    },
    messaging: {
      heading: 'Boîte de réception unifiée',
      description: 'Gère toutes tes conversations connectées en un seul endroit.',
      filtersTitle: 'Filtres',
      providerPlaceholder: 'Tous les canaux',
    },
  },
};

const frWalletOverrides: WalletTranslationOverrides = {
  auth: {
    title: 'Accès requis',
    signInPrompt: 'Connecte-toi pour accéder à ton portefeuille.',
  },
  header: {
    title: 'Portefeuille',
    compliance: {
      title: 'Note de conformité',
      description:
        'Les crédits PLGD sont un solde numérique dédié. Ils ne sont pas transférables, ne génèrent pas d\'intérêt et ne constituent pas des dépôts garantis.',
      bulletPoints: {
        holdPeriod: 'Les crédits disponibles excluent les recharges en attente pendant 48 h afin de limiter les rétrofacturations.',
        refunds: 'Les remboursements créent des écritures inverses pour garder les soldes acheteur, vendeur et plateforme alignés.',
        disputes:
          'Contacte support@pluggd.io pour toute contestation. Les relevés sont conservés pour les audits réglementaires AML.',
      },
    },
  },
  balances: {
    total: {
      label: 'Solde total',
      helper: 'Solde total',
    },
    available: {
      label: 'Disponible',
      helper: 'Prêt à l\'emploi',
    },
    pending: {
      label: 'En attente',
      helper: 'Disponible dans 48 h',
    },
  },
  ledger: {
    title: 'Résumé du registre',
    description: {
      withEntries: 'Basé sur vos {{count}} dernières {{entryLabel}}.',
      empty: 'Aucune activité enregistrée pour le moment.',
    },
    descriptionLabels: {
      entry: 'entrée',
      entries: 'entrées',
    },
    summary: {
      creditsAdded: 'Crédits ajoutés',
      creditsSpent: 'Crédits dépensés',
      netMovement: 'Mouvement net',
      lastTransaction: 'Dernière transaction',
      noActivity: 'Pas encore d\'activité.',
      placeholder: 'Dès que tu recharges ou dépenses des crédits, nous résumerons les mouvements ici.',
    },
  },
  tabs: {
    overview: 'Vue d\'ensemble',
    activity: 'Activité',
    topUp: 'Recharger',
    cashOut: 'Retrait',
  },
  overview: {
    quickActions: {
      title: 'Actions rapides',
      description: 'Recharge ton portefeuille ou gère tes crédits',
      buy: 'Acheter {{amount}}',
      applySubscription: {
        label: 'Appliquer à l\'abonnement',
        helper: '{{amount}} crédits',
        alert: 'Au moins 1 000 crédits (£10) sont requis pour régler un abonnement.',
      },
    },
    accountStatus: {
      title: 'Statut du compte',
      description: 'Informations actuelles du portefeuille et du compte',
      accountType: {
        label: 'Type de compte',
        free: 'Gratuit',
      },
      totalCredits: 'Crédits totaux',
      availableCredits: 'Crédits disponibles',
      pendingCredits: 'Crédits en attente',
    },
    recentActivity: {
      title: 'Activité récente',
      description: 'Dernières transactions du portefeuille',
      items: {
        topUp: {
          title: 'Recharge',
          timeAgo: 'Il y a 2 jours',
        },
        purchase: {
          title: 'Achat de beat',
          timeAgo: 'Il y a 3 jours',
        },
      },
      viewAll: 'Voir toute l’activité →',
    },
  },
  topUp: {
    errors: {
      invalidAmount: 'Montant invalide',
    },
    packages: {
      title: 'Packs de crédits',
      description: 'Choisis le pack de crédits qui te convient',
      popular: 'Populaire',
      card: {
        title: '{{amount}} crédits',
        value: '{{credits}} crédits par {{currency}}',
        cta: 'Acheter maintenant',
      },
    },
    custom: {
      title: 'Montant personnalisé',
      description: 'Indique le nombre de crédits à acheter',
      placeholder: 'Saisis un montant',
      limits: 'Minimum : {{min}} crédits ({{minCurrency}}) | Maximum : {{max}} crédits ({{maxCurrency}})',
      summary: {
        credits: 'crédits',
        connector: 'pour',
      },
      purchaseButton: 'Acheter ce montant',
    },
    share: {
      title: 'Parraine & gagne des crédits',
      description: 'Invite tes amis et gagne des crédits lorsqu\'ils achètent',
      perks: {
        signup: '💰 {{credits}} crédits ({{reward}}) pour chaque inscription',
        purchase: '🎯 {{credits}} crédits ({{reward}}) lors d\'un premier achat de plus de £5',
        subscription: '🚀 {{credits}} crédits ({{reward}}) chacun lorsqu\'un abonnement démarre',
      },
      shareTitle: 'Rejoins Pluggd et gagne des crédits gratuits !',
      shareDescription: 'Inscris-toi et nous recevons tous les deux un bonus pour nos beats.',
      button: 'Partager & gagner des crédits',
    },
  },
  cashOut: {
    eligibility: {
      notice:
        'Tu dois disposer d’au moins {{minimumCredits}} ({{minimumCurrency}}) pour retirer. Ton solde disponible est de {{availableCredits}}.',
    },
    setup: {
      title: 'Configuration du paiement',
      accountTitle: 'Compte Stripe Connect',
      accountStatus: 'Connecté et vérifié',
      processing: 'Les retraits sont traités en 3 à 5 jours ouvrables vers ton compte bancaire.',
    },
    form: {
      title: 'Retirer des crédits',
      description: 'Convertis tes crédits en GBP et transfère-les sur ton compte bancaire',
      amountLabel: 'Montant à retirer',
      placeholder: 'Minimum {{minimumCredits}}',
      available: 'Disponible : {{availableCredits}}',
      processing: 'Traitement…',
      submit: 'Retirer {{amount}}',
    },
    summary: {
      title: 'Résumé du retrait',
      creditsLabel: 'Crédits à convertir :',
      grossLabel: 'Montant brut :',
      commissionLabel: 'Commission ({{rate}}) :',
      netLabel: 'Montant net :',
    },
    disclaimers: {
      minimum: '• Retrait minimum : {{minimumCurrency}}',
      timeline: '• Délai de traitement : 3 à 5 jours ouvrables',
      commission: '• Les commissions varient selon l’abonnement',
      confirmation: '• Un e-mail de confirmation est envoyé après traitement',
    },
    history: {
      title: 'Retraits récents',
      description: 'Historique et statut des retraits',
      items: {
        completed: {
          title: 'Retrait',
          subtitle: 'Terminé • 15 déc. 2024',
          status: 'Payé',
        },
        processing: {
          title: 'Retrait',
          subtitle: 'En cours • 18 déc. 2024',
          status: 'En attente',
        },
      },
    },
  },
  activity: {
    filter: {
      title: 'Filtrer l’activité',
      placeholder: 'Filtrer par type',
      all: 'Toutes les transactions',
    },
    searchPlaceholder: 'Rechercher des transactions',
    history: {
      title: 'Historique des transactions',
      description: 'Suis chaque crédit et débit du portefeuille',
      empty: 'Aucune transaction trouvée',
      clear: 'Réinitialiser les filtres',
      refresh: 'Actualiser',
    },
    descriptions: {
      tipSent: 'Pourboire envoyé',
      purchase: 'Achat {{refType}}',
      battleEntry: 'Inscription battle',
      prizeAwarded: 'Prix {{refType}} attribué',
    },
    labels: {
      genericTransaction: 'Transaction',
      unknown: 'Autre ({{kind}})',
    },
  },
  actions: {
    topUp: 'Recharger',
    tipSent: 'Pourboire envoyé',
    purchase: 'Achat',
    battleEntry: 'Battle',
    prizeAwarded: 'Prix attribué',
    cashOut: 'Retrait',
    creditsApplied: 'Crédits appliqués à l’abonnement',
  },
};

const esOverrides: TranslationOverrides = {
  common: {
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    warning: 'Advertencia',
    info: 'Información',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    save: 'Guardar',
    edit: 'Editar',
    delete: 'Eliminar',
    create: 'Crear',
    update: 'Actualizar',
    search: 'Buscar',
    filter: 'Filtrar',
    sort: 'Ordenar',
    close: 'Cerrar',
    back: 'Atrás',
    next: 'Siguiente',
    previous: 'Anterior',
    yes: 'Sí',
    no: 'No',
    preview: 'Vista previa'
  },
  auth: {
    signIn: 'Iniciar sesión',
    signOut: 'Cerrar sesión',
    signUp: 'Crear cuenta',
    email: 'Correo electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar contraseña',
    forgotPassword: '¿Olvidaste tu contraseña?',
    rememberMe: 'Recuérdame',
    loginRequired: 'Inicia sesión para continuar',
    invalidCredentials: 'Correo o contraseña inválidos',
    passwordsDoNotMatch: 'Las contraseñas no coinciden',
    accountCreated: 'Cuenta creada correctamente',
    passwordReset: 'Se envió un correo para restablecer la contraseña'
  },
  navigation: {
    home: 'Inicio',
    marketplace: 'Marketplace',
    library: 'Biblioteca',
    tools: 'Herramientas',
    education: 'Educación',
    community: 'Comunidad',
    dashboard: 'Panel',
    profile: 'Perfil',
    settings: 'Configuración',
    help: 'Ayuda',
    contact: 'Contacto'
  },
  settings: {
    general: 'General',
    account: 'Cuenta',
    privacy: 'Privacidad',
    notifications: 'Notificaciones',
    language: 'Idioma',
    currency: 'Moneda',
    timezone: 'Zona horaria',
    dateFormat: 'Formato de fecha',
    timeFormat: 'Formato de hora',
    theme: 'Tema'
  },
  pages: {
    education: {
      heading: 'Mi panel de aprendizaje',
      subheading: 'Continúa tu camino hacia la maestría',
      adminButton: 'Panel de administración',
      upgradeButton: 'Mejorar a Pro',
      stats: {
        active: 'Cursos activos',
        completed: 'Completados',
        hoursLearned: 'Horas aprendidas',
        streak: 'Racha actual'
      }
    },
    wallet: {
      heading: 'Billetera',
      complianceTitle: 'Aviso de cumplimiento',
      complianceDescription:
        'Los créditos PLGD son un saldo digital de propósito limitado. No son transferibles, no generan intereses y no son depósitos asegurados.',
      headingBadge: 'Resumen de la billetera'
    },
    live: {
      heroTagline: 'Conéctate',
      heroTitle: 'Batallas en vivo, showcases y transmisiones de creadores',
      heroSubtitle:
        'La energía de la cultura en tiempo real. Presenta, actúa y recibe comentarios de la comunidad.',
      ctaJoinSession: 'Unirse a una sesión',
      ctaViewBattles: 'Ver batallas',
      ctaJoinCommunity: 'Unirse a la comunidad',
      ctaViewSessions: 'Ver sesiones',
      scheduleHeading: 'Próximos eventos',
      scheduleEmpty: 'No hay eventos próximos. Vuelve pronto.',
      statusLiveNow: 'En vivo ahora',
      statusStartingSoon: 'Comienza pronto',
      statusScheduleTba: 'Horario por confirmar',
      statusEndsIn: 'Termina {{time}}',
      statusStartsIn: 'Comienza {{time}}',
      actionJoinSession: 'Unirse a la sesión',
      actionViewSession: 'Ver sesión',
      actionWatchBattle: 'Ver batalla',
      actionViewBattle: 'Ver batalla',
      liveRoomsHeading: 'Salas en vivo',
      viewAllSessions: 'Ver todas las sesiones',
      joinLiveRoom: 'Unirse a la sala en vivo'
    },
    messaging: {
      heading: 'Bandeja unificada',
      description: 'Gestiona conversaciones de tus canales conectados en un solo lugar.',
      filtersTitle: 'Filtros',
      providerPlaceholder: 'Todos los proveedores'
    }
  },
  dates: {
    today: 'Hoy',
    yesterday: 'Ayer',
    tomorrow: 'Mañana',
    thisWeek: 'Esta semana',
    lastWeek: 'La semana pasada',
    thisMonth: 'Este mes',
    lastMonth: 'El mes pasado',
    thisYear: 'Este año',
    lastYear: 'El año pasado',
    justNow: 'Justo ahora'
  },
  messaging: {
    title: 'Mensajes',
    searchPlaceholder: 'Buscar en la bandeja...',
    loadingConversations: 'Cargando conversaciones...',
    emptyState: 'Aún no hay conversaciones',
    loading: 'Cargando...',
    loadMore: 'Cargar más',
    threadFallback: 'Bandeja de entrada',
    threadHeaderFallback: 'Conversación de la bandeja',
    authorPrefix: '{{author}}: ',
    badgeOverflow: '{{count}}+',
    loadPreviousMessages: 'Cargar mensajes anteriores',
    loadingMessages: 'Cargando mensajes...',
    optimisticStatus: ' • enviando',
    composerPlaceholder: 'Escribe un mensaje...',
    emptyThreadState: 'Selecciona una conversación para empezar a chatear'
  }
};

const esWalletOverrides: WalletTranslationOverrides = {
  auth: {
    title: 'Acceso requerido',
    signInPrompt: 'Inicia sesión para acceder a tu monedero.'
  },
  header: {
    title: 'Billetera',
    compliance: {
      title: 'Aviso de cumplimiento',
      description:
        'Los créditos PLGD son un saldo digital de propósito limitado. No son transferibles, no generan intereses y no están asegurados.',
      bulletPoints: {
        holdPeriod: 'Los créditos disponibles excluyen recargas pendientes durante las primeras 48 horas para mitigar contracargos.',
        refunds: 'Los reembolsos crean asientos inversos para mantener alineados los saldos del comprador, vendedor y la plataforma.',
        disputes:
          'Contacta a support@pluggd.io para disputas del libro mayor. Los estados de cuenta se conservan para auditorías contra el lavado de dinero.'
      }
    }
  },
  balances: {
    total: {
      label: 'Saldo total',
      helper: 'Saldo total'
    },
    available: {
      label: 'Disponible',
      helper: 'Listo para gastar'
    },
    pending: {
      label: 'Pendiente',
      helper: 'Disponible en 48 h'
    }
  },
  ledger: {
    title: 'Resumen del libro mayor',
    description: {
      withEntries: 'Basado en tus últimas {{count}} {{entryLabel}} del libro mayor.',
      empty: 'Todavía no hay actividad registrada en el libro mayor.'
    },
    descriptionLabels: {
      entry: 'entrada',
      entries: 'entradas'
    },
    summary: {
      creditsAdded: 'Créditos añadidos',
      creditsSpent: 'Créditos gastados',
      netMovement: 'Movimiento neto',
      lastTransaction: 'Última transacción',
      noActivity: 'Aún no se registran movimientos.',
      placeholder: 'Cuando empieces a recargar o gastar créditos, resumiremos el movimiento aquí.'
    }
  },
  tabs: {
    overview: 'Resumen',
    activity: 'Actividad',
    topUp: 'Recargar',
    cashOut: 'Retirar'
  },
  overview: {
    quickActions: {
      title: 'Acciones rápidas',
      description: 'Recarga tu monedero o gestiona tus créditos',
      buy: 'Comprar {{amount}}',
      applySubscription: {
        label: 'Aplicar a la suscripción',
        helper: '{{amount}} créditos',
        alert: 'Necesitas al menos 1.000 créditos (£10) para aplicarlos a la suscripción.'
      }
    },
    accountStatus: {
      title: 'Estado de la cuenta',
      description: 'Información actual de tu monedero y cuenta',
      accountType: {
        label: 'Tipo de cuenta',
        free: 'Gratis'
      },
      totalCredits: 'Créditos totales',
      availableCredits: 'Créditos disponibles',
      pendingCredits: 'Créditos pendientes'
    },
    recentActivity: {
      title: 'Actividad reciente',
      description: 'Tus transacciones más recientes del monedero',
      items: {
        topUp: {
          title: 'Recarga',
          timeAgo: 'Hace 2 días'
        },
        purchase: {
          title: 'Compra de beat',
          timeAgo: 'Hace 3 días'
        }
      },
      viewAll: 'Ver toda la actividad →'
    }
  },
  topUp: {
    errors: {
      invalidAmount: 'Importe inválido'
    },
    packages: {
      title: 'Paquetes de créditos',
      description: 'Elige el paquete de créditos que se adapte a tus necesidades',
      popular: 'Popular',
      card: {
        title: '{{amount}} créditos',
        value: '{{credits}} créditos por {{currency}}',
        cta: 'Comprar ahora'
      }
    },
    custom: {
      title: 'Monto personalizado',
      description: 'Ingresa la cantidad de créditos que deseas comprar',
      placeholder: 'Introduce la cantidad de créditos',
      limits: 'Mínimo: {{min}} créditos ({{minCurrency}}) | Máximo: {{max}} créditos ({{maxCurrency}})',
      summary: {
        credits: 'créditos',
        connector: 'por'
      },
      purchaseButton: 'Comprar monto personalizado'
    },
    share: {
      title: 'Comparte y gana créditos gratis',
      description: 'Invita a tus amigos y gana créditos cuando se unan y realicen compras',
      perks: {
        signup: '💰 {{credits}} créditos ({{reward}}) por cada registro de amigo',
        purchase: '🎯 {{credits}} créditos ({{reward}}) cuando realicen su primera compra de más de £5',
        subscription: '🚀 {{credits}} créditos ({{reward}}) para cada uno cuando inicien una suscripción'
      },
      shareTitle: '¡Únete a Pluggd y obtén créditos gratis!',
      shareDescription: 'Regístrate y ambos recibimos créditos extra para gastar en beats y más.',
      button: 'Compartir y ganar créditos'
    }
  },
  cashOut: {
    eligibility: {
      notice:
        'Necesitas al menos {{minimumCredits}} ({{minimumCurrency}}) para retirar. Tu saldo disponible actual es de {{availableCredits}}.'
    },
    setup: {
      title: 'Configuración de pagos',
      accountTitle: 'Cuenta de Stripe Connect',
      accountStatus: 'Conectada y verificada',
      processing: 'Los retiros se procesan en 3-5 días hábiles a tu cuenta bancaria conectada.'
    },
    form: {
      title: 'Retirar créditos',
      description: 'Convierte tus créditos a GBP y transfiérelos a tu cuenta bancaria',
      amountLabel: 'Monto a retirar',
      placeholder: 'Mínimo {{minimumCredits}}',
      available: 'Disponible: {{availableCredits}}',
      processing: 'Procesando...',
      submit: 'Retirar {{amount}}'
    },
    summary: {
      title: 'Resumen del retiro',
      creditsLabel: 'Créditos a convertir:',
      grossLabel: 'Monto bruto:',
      commissionLabel: 'Comisión de la plataforma ({{rate}}):',
      netLabel: 'Monto neto:'
    },
    disclaimers: {
      minimum: '• Retiro mínimo: {{minimumCurrency}}',
      timeline: '• Tiempo de procesamiento: 3-5 días hábiles',
      commission: '• Las comisiones varían según el plan de suscripción',
      confirmation: '• Recibirás un correo de confirmación cuando se procese'
    },
    history: {
      title: 'Retiros recientes',
      description: 'Historial y estado de tus retiros',
      items: {
        completed: {
          title: 'Retiro',
          subtitle: 'Completado • 15 dic 2024',
          status: 'Pagado'
        },
        processing: {
          title: 'Retiro',
          subtitle: 'En proceso • 18 dic 2024',
          status: 'Pendiente'
        }
      }
    }
  },
  activity: {
    filter: {
      title: 'Filtrar actividad',
      placeholder: 'Filtrar por tipo',
      all: 'Todas las transacciones'
    },
    searchPlaceholder: 'Buscar transacciones',
    history: {
      title: 'Historial de transacciones',
      description: 'Consulta cada crédito y débito del monedero',
      empty: 'No se encontraron transacciones',
      clear: 'Borrar filtros',
      refresh: 'Actualizar'
    },
    descriptions: {
      tipSent: 'Propina enviada',
      purchase: 'Compra de {{refType}}',
      battleEntry: 'Entrada a batalla',
      prizeAwarded: 'Premio otorgado de {{refType}}'
    },
    labels: {
      genericTransaction: 'Transacción',
      unknown: 'Otro ({{kind}})'
    }
  },
  actions: {
    topUp: 'Recargar',
    tipSent: 'Propina enviada',
    purchase: 'Compra',
    battleEntry: 'Entrada a batalla',
    prizeAwarded: 'Premio otorgado',
    cashOut: 'Retiro',
    creditsApplied: 'Créditos aplicados a la suscripción'
  }
};

export const translationResources = {
  'en-US': createResource(),
  'en-GB': createResource(),
  'en-CA': createResource(),
  'en-AU': createResource(),
  'de-DE': createResource(deOverrides, deWalletOverrides),
  'fr-FR': createResource(frOverrides, frWalletOverrides),
  'es-ES': createResource(esOverrides, esWalletOverrides),
  'it-IT': createResource(),
  'ja-JP': createResource(),
  'ko-KR': createResource()
} as const satisfies Record<LocaleCode, TranslationResource>;

export type TranslationResources = typeof translationResources;

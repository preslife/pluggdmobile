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
      scheduleHeading: 'Upcoming Schedule',
      statusLiveNow: 'Live now',
      statusStartingSoon: 'Starting soon',
      statusScheduleTba: 'Schedule TBA',
      statusEndsIn: 'Ends {{time}}',
      statusStartsIn: 'Starts {{time}}',
      actionJoinSession: 'Join Session',
      actionViewSession: 'View Session',
      actionWatchBattle: 'Watch Battle',
      actionViewBattle: 'View Battle'
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
      scheduleHeading: 'Próximos eventos',
      statusLiveNow: 'En vivo',
      statusStartingSoon: 'Comienza pronto',
      statusScheduleTba: 'Horario por confirmar',
      statusEndsIn: 'Termina {{time}}',
      statusStartsIn: 'Comienza {{time}}',
      actionJoinSession: 'Unirse a la sesión',
      actionViewSession: 'Ver sesión',
      actionWatchBattle: 'Ver batalla',
      actionViewBattle: 'Ver batalla'
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
  'de-DE': createResource(),
  'fr-FR': createResource(),
  'es-ES': createResource(esOverrides, esWalletOverrides),
  'it-IT': createResource(),
  'ja-JP': createResource(),
  'ko-KR': createResource()
} as const satisfies Record<LocaleCode, TranslationResource>;

export type TranslationResources = typeof translationResources;

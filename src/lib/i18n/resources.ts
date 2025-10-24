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
  }
} as const;

export type TranslationShape = typeof baseTranslation;
export type TranslationOverrides = Partial<TranslationShape>;

type TranslationResource = {
  translation: TranslationShape;
};

const cloneBase = (): TranslationShape =>
  JSON.parse(JSON.stringify(baseTranslation)) as TranslationShape;

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

const createResource = (overrides?: TranslationOverrides): TranslationResource => {
  if (!overrides) {
    return { translation: baseTranslation };
  }

  const merged = cloneBase();
  applyOverrides(merged, overrides);
  return { translation: merged };
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
  wallet: {
    balance: 'Saldo',
    credits: 'Créditos',
    topUp: 'Recargar',
    cashOut: 'Retirar',
    transaction: 'Transacción',
    transactionHistory: 'Historial de transacciones',
    amount: 'Importe',
    date: 'Fecha',
    type: 'Tipo',
    status: 'Estado',
    pending: 'Pendiente',
    completed: 'Completado',
    failed: 'Fallido',
    insufficientCredits: 'Créditos insuficientes',
    cashOutSuccess: 'Solicitud de retiro enviada'
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
    theme: 'Tema',
    darkMode: 'Modo oscuro',
    lightMode: 'Modo claro',
    systemDefault: 'Predeterminado del sistema',
    emailNotifications: 'Notificaciones por correo',
    pushNotifications: 'Notificaciones push',
    marketingEmails: 'Correos promocionales',
    autoDetect: 'Detección automática',
    custom: 'Personalizado',
    twelveHour: '12 horas',
    twentyFourHour: '24 horas'
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
  }
};

export const translationResources = {
  'en-US': createResource(),
  'en-GB': createResource(),
  'en-CA': createResource(),
  'en-AU': createResource(),
  'de-DE': createResource(),
  'fr-FR': createResource(),
  'es-ES': createResource(esOverrides),
  'it-IT': createResource(),
  'ja-JP': createResource(),
  'ko-KR': createResource()
} as const satisfies Record<LocaleCode, TranslationResource>;

export type TranslationResources = typeof translationResources;

export type EventTakeoverPhase = 'hidden' | 'preview' | 'planning' | 'live' | 'wind_down' | 'archived';

export type EventTakeoverCategory = {
  id: string;
  label: string;
  terms: readonly string[];
};

export type EventTakeoverConfig = {
  id: string;
  shortLabel: string;
  eyebrow: string;
  title: string;
  summary: string;
  hubHref: string;
  timeZone: string;
  promotionStartsOn: string;
  previewEndsOn?: string;
  liveStartsOn: string;
  liveEndsOn: string;
  windDownEndsOn: string;
  collectionStartsOn: string;
  collectionEndsOn: string;
  cities: readonly string[];
  locationTerms: readonly string[];
  identityTerms: readonly string[];
  categories: readonly EventTakeoverCategory[];
};

export type EventTakeoverCandidate = {
  title?: string | null;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  city?: string | null;
  location?: string | null;
  venue_name?: string | null;
  genre_tags?: readonly string[] | null;
  event_tags?: readonly string[] | null;
  ticket_url?: string | null;
};

export type EventTakeoverGroup = 'before' | 'live' | 'after';

const ISO_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const normalize = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, ' ')
    .trim();

const containsTerm = (haystack: string, term: string): boolean => {
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) return false;
  return ` ${haystack} `.includes(` ${normalizedTerm} `);
};

export const zonedCalendarDay = (value: Date, timeZone: string): string => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

const assertDay = (value: string): string => {
  if (!ISO_DAY_PATTERN.test(value)) throw new Error(`Invalid takeover calendar day: ${value}`);
  return value;
};

export const resolveEventTakeoverPhase = (
  config: EventTakeoverConfig,
  now = new Date(),
): EventTakeoverPhase => {
  const day = zonedCalendarDay(now, config.timeZone);
  const promotionStartsOn = assertDay(config.promotionStartsOn);
  const liveStartsOn = assertDay(config.liveStartsOn);
  const liveEndsOn = assertDay(config.liveEndsOn);
  const windDownEndsOn = assertDay(config.windDownEndsOn);

  if (day < promotionStartsOn) return 'hidden';
  if (config.previewEndsOn && day <= assertDay(config.previewEndsOn)) return 'preview';
  if (day < liveStartsOn) return 'planning';
  if (day <= liveEndsOn) return 'live';
  if (day <= windDownEndsOn) return 'wind_down';
  return 'archived';
};

export const isEventTakeoverEntryVisible = (phase: EventTakeoverPhase): boolean =>
  phase === 'preview' || phase === 'planning' || phase === 'live' || phase === 'wind_down';

export const eventTakeoverSearchText = (event: EventTakeoverCandidate): string =>
  normalize([
    event.title,
    event.description,
    event.city,
    event.location,
    event.venue_name,
    ...(event.genre_tags ?? []),
    ...(event.event_tags ?? []),
  ].filter(Boolean).join(' '));

export const eventBelongsToTakeover = (
  event: EventTakeoverCandidate,
  config: EventTakeoverConfig,
): boolean => {
  const start = new Date(event.starts_at ?? '');
  if (!Number.isFinite(start.getTime())) return false;

  const eventDay = zonedCalendarDay(start, config.timeZone);
  if (eventDay < config.collectionStartsOn || eventDay > config.collectionEndsOn) return false;

  const text = eventTakeoverSearchText(event);
  const cityMatches = config.cities.some((city) => normalize(event.city ?? '') === normalize(city));
  const locationMatches = config.locationTerms.some((term) => containsTerm(text, term));
  if (!cityMatches && !locationMatches) return false;

  return config.identityTerms.some((term) => containsTerm(text, term));
};

export const eventMatchesTakeoverCategory = (
  event: EventTakeoverCandidate,
  categoryId: string,
  config: EventTakeoverConfig,
): boolean => {
  if (categoryId === 'all') return true;
  const category = config.categories.find((item) => item.id === categoryId);
  if (!category) return false;
  const text = eventTakeoverSearchText(event);
  return category.terms.some((term) => containsTerm(text, term));
};

export const takeoverGroupForEvent = (
  event: EventTakeoverCandidate,
  config: EventTakeoverConfig,
): EventTakeoverGroup | null => {
  const start = new Date(event.starts_at ?? '');
  if (!Number.isFinite(start.getTime())) return null;
  const eventDay = zonedCalendarDay(start, config.timeZone);
  if (eventDay < config.liveStartsOn) return 'before';
  if (eventDay <= config.liveEndsOn) return 'live';
  return 'after';
};

export const eventTakeoverPhaseCopy = (
  phase: EventTakeoverPhase,
): { label: string; title: string; copy: string } => {
  if (phase === 'preview') {
    return {
      label: 'Coming into view',
      title: 'The complete programme is landing',
      copy: 'Save the guide now and come back as verified events join the collection.',
    };
  }
  if (phase === 'planning') {
    return {
      label: 'Plan before the road',
      title: 'Build the whole Carnival weekend',
      copy: 'Find the warm-ups, road essentials, sound systems, workshops and after-parties in one place.',
    };
  }
  if (phase === 'live') {
    return {
      label: 'Live now',
      title: 'Carnival is on the road',
      copy: 'Use the live collection and map together, then open the complete guide for routes, access and essentials.',
    };
  }
  if (phase === 'wind_down') {
    return {
      label: 'After the road',
      title: 'Keep the weekend moving',
      copy: 'Find the remaining after-parties, revisit saved plans and return to the Carnival archive.',
    };
  }
  return {
    label: 'Carnival archive',
    title: 'The road lives on',
    copy: 'Return to the complete guide, stories and community memories.',
  };
};

export const NOTTING_HILL_CARNIVAL_2026_TAKEOVER: EventTakeoverConfig = {
  id: 'notting-hill-carnival-2026',
  shortLabel: 'Carnival 60',
  eyebrow: 'PLUGGD Cultural Takeover',
  title: 'Every Carnival plan. One road-ready board.',
  summary: 'Warm-ups, sound systems, mas, workshops, family plans and after-parties around Notting Hill Carnival 2026.',
  hubHref: '/hubs/notting-hill-carnival-2026',
  timeZone: 'Europe/London',
  promotionStartsOn: '2026-08-10',
  previewEndsOn: '2026-08-16',
  liveStartsOn: '2026-08-29',
  liveEndsOn: '2026-08-31',
  windDownEndsOn: '2026-09-07',
  collectionStartsOn: '2026-08-01',
  collectionEndsOn: '2026-09-07',
  cities: ['London'],
  locationTerms: ['Notting Hill', 'Westbourne Park', 'Ladbroke Grove', 'Kensal Road', 'W10', 'W11'],
  identityTerms: ['Notting Hill Carnival', 'Carnival', 'NHC'],
  categories: [
    { id: 'free', label: 'Free', terms: ['free', 'free entry', 'no ticket'] },
    { id: 'sounds', label: 'Sound systems', terms: ['sound system', 'sound systems', 'stage', 'sounds'] },
    { id: 'mas', label: "Mas + J'ouvert", terms: ['mas', 'mas band', "j'ouvert", 'jouvert', 'parade'] },
    { id: 'workshops', label: 'Workshops + talks', terms: ['workshop', 'talk', 'panel', 'exhibition', 'masterclass'] },
    { id: 'parties', label: 'Parties', terms: ['after party', 'afterparty', 'after-party', 'pre party', 'pre-party', 'warm up', 'warm-up', 'brunch', 'rave'] },
    { id: 'family', label: 'Family', terms: ['family', 'children', 'kids', 'family day'] },
  ],
};

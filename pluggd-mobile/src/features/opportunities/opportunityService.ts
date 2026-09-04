import type { ImageSourcePropType } from 'react-native';
import { supabase } from '../../lib/supabase';

export const OPEN_OPPORTUNITY_STATUSES = ['open', 'closing_soon', 'rolling'] as const;

export type OpportunityDeliveryMode = 'online' | 'in_person' | 'hybrid' | null;
export type UserOpportunityStatus = 'saved' | 'preparing' | 'ready' | 'applied' | 'successful' | 'unsuccessful' | 'dismissed';

export interface OpportunityRecord {
  id: string;
  slug: string | null;
  source_url: string | null;
  official_application_url: string | null;
  guidelines_url: string | null;
  title: string;
  body: string | null;
  summary: string | null;
  description_summary: string | null;
  organiser_name: string | null;
  organiser_logo_url: string | null;
  opportunity_type: string;
  creator_roles: string[];
  eligible_countries: string[];
  genre_tags: string[];
  career_stages: string[];
  tags: string[];
  city: string | null;
  location: string | null;
  delivery_mode: OpportunityDeliveryMode;
  funding_min: number | null;
  funding_max: number | null;
  currency: string | null;
  benefit_summary: string | null;
  application_fee: number | null;
  travel_support: boolean | null;
  accommodation_support: boolean | null;
  opens_at: string | null;
  closes_at: string | null;
  expires_at: string | null;
  rolling_deadline: boolean;
  deadline_timezone: string;
  status: string;
  verification_status: string;
  verified_at: string | null;
  last_checked_at: string | null;
  featured: boolean;
  available_slots: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export interface OpportunityRequirementRecord {
  id: string;
  opportunity_id: string;
  criterion_key: string;
  operator: OpportunityRequirementOperator;
  expected_value: unknown;
  public_label: string;
  public_explanation: string | null;
  requirement_level: 'hard' | 'required' | 'preferred';
  weight: number;
  source_reference: string | null;
  sort_order: number;
}

export type OpportunityRequirementOperator =
  | 'equals'
  | 'not_equals'
  | 'in'
  | 'not_in'
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'contains'
  | 'exists'
  | 'true'
  | 'false'
  | 'any_of'
  | 'all_of'
  | 'custom_manual';

export type OpportunityMatchState =
  | 'strong_match'
  | 'likely_match'
  | 'needs_information'
  | 'low_match'
  | 'ineligible';

export type OpportunityRequirementEvaluation = 'pass' | 'fail' | 'unknown' | 'not_applicable';

export interface OpportunityMatchReason {
  requirementId: string;
  criterionKey: string;
  label: string;
  explanation: string | null;
  requirementLevel: OpportunityRequirementRecord['requirement_level'];
  status: OpportunityRequirementEvaluation;
  weight: number;
}

export interface OpportunityMatchResult {
  score: number;
  confidence: number;
  state: OpportunityMatchState;
  reasons: OpportunityMatchReason[];
  missingFacts: OpportunityMatchReason[];
  algorithmVersion: '1.0.0';
}

export interface UserOpportunityFactRecord {
  id: string;
  user_id: string;
  opportunity_id: string | null;
  fact_key: string;
  value: unknown;
  fact_scope: 'persistent' | 'opportunity';
  source: 'declared' | 'derived' | 'verified' | 'imported';
  confidence: number;
  is_verified: boolean;
  expires_at: string | null;
  updated_at: string;
}

export interface OpportunityProfileSnapshot {
  country: string | null;
  city: string | null;
  dateOfBirth: string | null;
  roles: string[];
  genres: string[];
  releaseCount: number;
  beatCount: number;
  mixCount: number;
  eventCount: number;
  privateFacts: UserOpportunityFactRecord[];
}

export interface OpportunityApplicationItemRecord {
  id: string;
  opportunity_id: string;
  item_key: string;
  item_type: string;
  label: string;
  description: string | null;
  is_required: boolean;
  sort_order: number;
}

export interface UserOpportunityRecord {
  id: string;
  user_id: string;
  opportunity_id: string;
  status: UserOpportunityStatus;
  saved_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  applied_at: string | null;
  outcome_at: string | null;
  updated_at: string;
}

export interface UserOpportunityItemRecord {
  id: string;
  user_id: string;
  opportunity_id: string;
  application_item_id: string;
  is_complete: boolean;
  value: unknown;
  completed_at: string | null;
  updated_at: string;
}

export const OPPORTUNITY_SELECT = [
  'id', 'slug', 'source_url', 'official_application_url', 'guidelines_url', 'title', 'body', 'summary',
  'description_summary', 'organiser_name', 'organiser_logo_url', 'opportunity_type', 'creator_roles',
  'eligible_countries', 'genre_tags', 'career_stages', 'tags', 'city', 'location', 'delivery_mode',
  'funding_min', 'funding_max', 'currency', 'benefit_summary', 'application_fee', 'travel_support',
  'accommodation_support', 'opens_at', 'closes_at', 'expires_at', 'rolling_deadline', 'deadline_timezone',
  'status', 'verification_status', 'verified_at', 'last_checked_at', 'featured', 'available_slots',
  'metadata', 'published_at', 'created_at', 'updated_at',
].join(',');

const cleanRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};

const cleanStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())))
    : [];

const cleanNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export function parseOpportunityRecord(value: unknown): OpportunityRecord {
  const row = cleanRecord(value);
  const delivery = row.delivery_mode;
  return {
    id: String(row.id ?? ''),
    slug: typeof row.slug === 'string' ? row.slug : null,
    source_url: typeof row.source_url === 'string' ? row.source_url : null,
    official_application_url: typeof row.official_application_url === 'string' ? row.official_application_url : null,
    guidelines_url: typeof row.guidelines_url === 'string' ? row.guidelines_url : null,
    title: String(row.title ?? ''),
    body: typeof row.body === 'string' ? row.body : null,
    summary: typeof row.summary === 'string' ? row.summary : null,
    description_summary: typeof row.description_summary === 'string' ? row.description_summary : null,
    organiser_name: typeof row.organiser_name === 'string' ? row.organiser_name : null,
    organiser_logo_url: typeof row.organiser_logo_url === 'string' ? row.organiser_logo_url : null,
    opportunity_type: String(row.opportunity_type ?? 'other'),
    creator_roles: cleanStringArray(row.creator_roles),
    eligible_countries: cleanStringArray(row.eligible_countries),
    genre_tags: cleanStringArray(row.genre_tags),
    career_stages: cleanStringArray(row.career_stages),
    tags: cleanStringArray(row.tags),
    city: typeof row.city === 'string' ? row.city : null,
    location: typeof row.location === 'string' ? row.location : null,
    delivery_mode: delivery === 'online' || delivery === 'in_person' || delivery === 'hybrid' ? delivery : null,
    funding_min: cleanNullableNumber(row.funding_min),
    funding_max: cleanNullableNumber(row.funding_max),
    currency: typeof row.currency === 'string' ? row.currency : null,
    benefit_summary: typeof row.benefit_summary === 'string' ? row.benefit_summary : null,
    application_fee: cleanNullableNumber(row.application_fee),
    travel_support: typeof row.travel_support === 'boolean' ? row.travel_support : null,
    accommodation_support: typeof row.accommodation_support === 'boolean' ? row.accommodation_support : null,
    opens_at: typeof row.opens_at === 'string' ? row.opens_at : null,
    closes_at: typeof row.closes_at === 'string' ? row.closes_at : null,
    expires_at: typeof row.expires_at === 'string' ? row.expires_at : null,
    rolling_deadline: row.rolling_deadline === true,
    deadline_timezone: typeof row.deadline_timezone === 'string' ? row.deadline_timezone : 'UTC',
    status: String(row.status ?? ''),
    verification_status: String(row.verification_status ?? 'unverified'),
    verified_at: typeof row.verified_at === 'string' ? row.verified_at : null,
    last_checked_at: typeof row.last_checked_at === 'string' ? row.last_checked_at : null,
    featured: row.featured === true,
    available_slots: cleanNullableNumber(row.available_slots),
    published_at: typeof row.published_at === 'string' ? row.published_at : null,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
    metadata: cleanRecord(row.metadata),
  };
}

export async function fetchPublishedOpportunities(limit = 100): Promise<OpportunityRecord[]> {
  const { data, error } = await (supabase as any)
    .from('opportunities')
    .select(OPPORTUNITY_SELECT)
    .in('status', OPEN_OPPORTUNITY_STATUSES)
    .eq('verification_status', 'verified')
    .order('featured', { ascending: false })
    .order('closes_at', { ascending: true, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(parseOpportunityRecord);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function fetchPublishedOpportunity(identifier: string): Promise<OpportunityRecord | null> {
  const db = supabase as any;
  const bySlug = await db
    .from('opportunities')
    .select(OPPORTUNITY_SELECT)
    .eq('slug', identifier)
    .in('status', OPEN_OPPORTUNITY_STATUSES)
    .eq('verification_status', 'verified')
    .maybeSingle();
  if (bySlug.error && bySlug.error.code !== 'PGRST116') throw bySlug.error;
  if (bySlug.data) return parseOpportunityRecord(bySlug.data);
  if (!UUID_PATTERN.test(identifier)) return null;

  const byId = await db
    .from('opportunities')
    .select(OPPORTUNITY_SELECT)
    .eq('id', identifier)
    .in('status', OPEN_OPPORTUNITY_STATUSES)
    .eq('verification_status', 'verified')
    .maybeSingle();
  if (byId.error && byId.error.code !== 'PGRST116') throw byId.error;
  return byId.data ? parseOpportunityRecord(byId.data) : null;
}

export async function fetchOpportunityRequirements(opportunityId: string): Promise<OpportunityRequirementRecord[]> {
  const { data, error } = await (supabase as any)
    .from('opportunity_requirements')
    .select('id,opportunity_id,criterion_key,operator,expected_value,public_label,public_explanation,requirement_level,weight,source_reference,sort_order')
    .eq('opportunity_id', opportunityId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as OpportunityRequirementRecord[];
}

export async function fetchOpportunityRequirementsForList(opportunityIds: string[]): Promise<OpportunityRequirementRecord[]> {
  if (!opportunityIds.length) return [];
  const { data, error } = await (supabase as any)
    .from('opportunity_requirements')
    .select('id,opportunity_id,criterion_key,operator,expected_value,public_label,public_explanation,requirement_level,weight,source_reference,sort_order')
    .in('opportunity_id', opportunityIds)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as OpportunityRequirementRecord[];
}

export async function fetchOpportunityApplicationItems(opportunityId: string): Promise<OpportunityApplicationItemRecord[]> {
  const { data, error } = await (supabase as any)
    .from('opportunity_application_items')
    .select('id,opportunity_id,item_key,item_type,label,description,is_required,sort_order')
    .eq('opportunity_id', opportunityId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as OpportunityApplicationItemRecord[];
}

export async function fetchUserOpportunityStates(userId: string, opportunityIds: string[]): Promise<UserOpportunityRecord[]> {
  if (!opportunityIds.length) return [];
  const { data, error } = await (supabase as any)
    .from('user_opportunities')
    .select('id,user_id,opportunity_id,status,saved_at,preparing_at,ready_at,applied_at,outcome_at,updated_at')
    .eq('user_id', userId)
    .in('opportunity_id', opportunityIds);
  if (error) throw error;
  return (data ?? []) as UserOpportunityRecord[];
}

export async function fetchUserOpportunityItems(userId: string, opportunityId: string): Promise<UserOpportunityItemRecord[]> {
  const { data, error } = await (supabase as any)
    .from('user_opportunity_items')
    .select('id,user_id,opportunity_id,application_item_id,is_complete,value,completed_at,updated_at')
    .eq('user_id', userId)
    .eq('opportunity_id', opportunityId);
  if (error) throw error;
  return (data ?? []) as UserOpportunityItemRecord[];
}

const countRows = async (query: PromiseLike<{ count: number | null; error: unknown }>) => {
  const result = await query;
  if (result.error) throw result.error;
  return result.count ?? 0;
};

export async function fetchOpportunityProfileSnapshot(userId: string): Promise<OpportunityProfileSnapshot> {
  const db = supabase as any;
  const [profile, roles, privateFacts, releaseCount, beatCount, mixCount, eventCount, releases, beats, mixes] = await Promise.all([
    db.from('profiles').select('country,city,date_of_birth').eq('user_id', userId).maybeSingle(),
    db.from('profile_roles').select('role').eq('user_id', userId),
    db.from('user_opportunity_facts').select('id,user_id,opportunity_id,fact_key,value,fact_scope,source,confidence,is_verified,expires_at,updated_at').eq('user_id', userId),
    countRows(db.from('releases').select('id', { count: 'exact', head: true }).or(`user_id.eq.${userId},owner_id.eq.${userId}`).eq('catalogue_mode', 'pluggd').neq('status', 'draft')),
    countRows(db.from('beats').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_published', true)),
    countRows(db.from('mixes').select('id', { count: 'exact', head: true }).eq('owner_user_id', userId).eq('status', 'published')),
    countRows(db.from('events').select('id', { count: 'exact', head: true }).or(`created_by.eq.${userId},promoter_user_id.eq.${userId}`).neq('occurrence_status', 'cancelled')),
    db.from('releases').select('genre,primary_genre,sub_genre').or(`user_id.eq.${userId},owner_id.eq.${userId}`).eq('catalogue_mode', 'pluggd').limit(100),
    db.from('beats').select('genre').eq('user_id', userId).eq('is_published', true).limit(100),
    db.from('mixes').select('genre_tags').eq('owner_user_id', userId).eq('status', 'published').limit(100),
  ]);

  if (profile.error && profile.error.code !== 'PGRST116') throw profile.error;
  if (roles.error) throw roles.error;
  if (privateFacts.error) throw privateFacts.error;

  const genres = new Set<string>();
  for (const row of releases.data ?? []) {
    for (const value of [row.genre, row.primary_genre, row.sub_genre]) {
      if (typeof value === 'string' && value.trim()) genres.add(value.trim());
    }
  }
  for (const row of beats.data ?? []) if (typeof row.genre === 'string' && row.genre.trim()) genres.add(row.genre.trim());
  for (const row of mixes.data ?? []) for (const value of cleanStringArray(row.genre_tags)) genres.add(value);

  return {
    country: typeof profile.data?.country === 'string' ? profile.data.country : null,
    city: typeof profile.data?.city === 'string' ? profile.data.city : null,
    dateOfBirth: typeof profile.data?.date_of_birth === 'string' ? profile.data.date_of_birth : null,
    roles: cleanStringArray((roles.data ?? []).map((row: { role?: unknown }) => row.role)),
    genres: [...genres],
    releaseCount,
    beatCount,
    mixCount,
    eventCount,
    privateFacts: (privateFacts.data ?? []) as UserOpportunityFactRecord[],
  };
}

type OpportunityFact = { value: unknown; confidence?: number };
type OpportunityFactMap = Record<string, OpportunityFact | undefined>;

const calculateAge = (dateOfBirth: string | null, now: Date) => {
  if (!dateOfBirth) return null;
  const birth = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (Number.isNaN(birth.getTime()) || birth > now) return null;
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDifference = now.getUTCMonth() - birth.getUTCMonth();
  if (monthDifference < 0 || (monthDifference === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age >= 0 && age <= 130 ? age : null;
};

function buildOpportunityFactMap(snapshot: OpportunityProfileSnapshot, opportunityId: string, now = new Date()): OpportunityFactMap {
  const age = calculateAge(snapshot.dateOfBirth, now);
  const facts: OpportunityFactMap = {
    role: snapshot.roles.length ? { value: snapshot.roles } : undefined,
    roles: snapshot.roles.length ? { value: snapshot.roles } : undefined,
    country: snapshot.country ? { value: snapshot.country } : undefined,
    residence_country: snapshot.country ? { value: snapshot.country } : undefined,
    city: snapshot.city ? { value: snapshot.city } : undefined,
    age: age === null ? undefined : { value: age },
    genre: snapshot.genres.length ? { value: snapshot.genres } : undefined,
    genres: snapshot.genres.length ? { value: snapshot.genres } : undefined,
    commercial_release_count: { value: snapshot.releaseCount },
    release_count: { value: snapshot.releaseCount },
    has_released_music: { value: snapshot.releaseCount > 0 },
    published_beat_count: { value: snapshot.beatCount },
    published_mix_count: { value: snapshot.mixCount },
    created_event_count: { value: snapshot.eventCount },
  };

  const activeFacts = snapshot.privateFacts
    .filter((fact) => !fact.expires_at || new Date(fact.expires_at).getTime() > now.getTime())
    .filter((fact) => fact.fact_scope === 'persistent' || fact.opportunity_id === opportunityId)
    .sort((left, right) => {
      if (left.fact_scope === right.fact_scope) return left.updated_at.localeCompare(right.updated_at);
      return left.fact_scope === 'persistent' ? -1 : 1;
    });
  for (const fact of activeFacts) facts[fact.fact_key] = { value: fact.value, confidence: Number(fact.confidence) };
  return facts;
}

function baselineRequirements(opportunity: OpportunityRecord): OpportunityRequirementRecord[] {
  const rows: OpportunityRequirementRecord[] = [];
  if (opportunity.creator_roles.length) rows.push({
    id: `${opportunity.id}:eligible_roles`, opportunity_id: opportunity.id, criterion_key: 'role', operator: 'any_of',
    expected_value: opportunity.creator_roles, public_label: 'Eligible role',
    public_explanation: `Open to ${opportunity.creator_roles.map((role) => formatOpportunityType(role)).join(', ')}.`,
    requirement_level: 'required', weight: 20, source_reference: null, sort_order: -30,
  });
  if (opportunity.eligible_countries.length) rows.push({
    id: `${opportunity.id}:eligible_countries`, opportunity_id: opportunity.id, criterion_key: 'residence_country', operator: 'in',
    expected_value: opportunity.eligible_countries, public_label: 'Eligible territory',
    public_explanation: 'Your country of residence must be in the published eligible territory.',
    requirement_level: 'hard', weight: 30, source_reference: null, sort_order: -20,
  });
  if (opportunity.genre_tags.length) rows.push({
    id: `${opportunity.id}:genres`, opportunity_id: opportunity.id, criterion_key: 'genres', operator: 'any_of',
    expected_value: opportunity.genre_tags, public_label: 'Genre relevance',
    public_explanation: `Published focus: ${opportunity.genre_tags.join(', ')}.`,
    requirement_level: 'preferred', weight: 8, source_reference: null, sort_order: -10,
  });
  return rows;
}

export function requirementsForOpportunity(opportunity: OpportunityRecord, structured: OpportunityRequirementRecord[]) {
  const keys = new Set(structured.map((item) => item.criterion_key));
  return [...baselineRequirements(opportunity).filter((item) => !keys.has(item.criterion_key)), ...structured]
    .sort((left, right) => left.sort_order - right.sort_order);
}

const normalise = (value: unknown) => typeof value === 'string' ? value.trim().toLocaleLowerCase() : value;
const asComparable = (value: unknown) => (Array.isArray(value) ? value : [value])
  .filter((item) => item !== null && item !== undefined && item !== '')
  .map(normalise);
const hasValue = (value: unknown) => value !== null && value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0);
const finiteNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
};

function evaluateRequirement(requirement: OpportunityRequirementRecord, fact?: OpportunityFact): OpportunityRequirementEvaluation {
  if (!fact) return 'unknown';
  const actual = asComparable(fact.value);
  const expected = asComparable(requirement.expected_value);
  const equal = actual.length === expected.length && actual.every((item) => expected.includes(item));
  switch (requirement.operator) {
    case 'equals': return equal ? 'pass' : 'fail';
    case 'not_equals': return equal ? 'fail' : 'pass';
    case 'in':
    case 'any_of': return actual.some((item) => expected.includes(item)) ? 'pass' : 'fail';
    case 'not_in': return actual.some((item) => expected.includes(item)) ? 'fail' : 'pass';
    case 'all_of':
    case 'contains': return expected.every((item) => actual.includes(item)) ? 'pass' : 'fail';
    case 'exists': return hasValue(fact.value) ? 'pass' : 'fail';
    case 'true': return fact.value === true ? 'pass' : 'fail';
    case 'false': return fact.value === false ? 'pass' : 'fail';
    case 'greater_than':
    case 'greater_than_or_equal':
    case 'less_than':
    case 'less_than_or_equal': {
      const actualNumber = finiteNumber(fact.value);
      const expectedNumber = finiteNumber(requirement.expected_value);
      if (actualNumber === null || expectedNumber === null) return 'unknown';
      if (requirement.operator === 'greater_than') return actualNumber > expectedNumber ? 'pass' : 'fail';
      if (requirement.operator === 'greater_than_or_equal') return actualNumber >= expectedNumber ? 'pass' : 'fail';
      if (requirement.operator === 'less_than') return actualNumber < expectedNumber ? 'pass' : 'fail';
      return actualNumber <= expectedNumber ? 'pass' : 'fail';
    }
    default: return 'unknown';
  }
}

export function evaluateOpportunityMatch(
  opportunity: OpportunityRecord,
  structuredRequirements: OpportunityRequirementRecord[],
  snapshot: OpportunityProfileSnapshot,
): OpportunityMatchResult {
  const facts = buildOpportunityFactMap(snapshot, opportunity.id);
  const reasons = requirementsForOpportunity(opportunity, structuredRequirements).map((requirement) => ({
    requirementId: requirement.id,
    criterionKey: requirement.criterion_key,
    label: requirement.public_label,
    explanation: requirement.public_explanation,
    requirementLevel: requirement.requirement_level,
    weight: Math.min(100, Math.max(0, Number(requirement.weight) || 0)),
    status: evaluateRequirement(requirement, facts[requirement.criterion_key]),
  }));
  const known = reasons.filter((reason) => reason.status === 'pass' || reason.status === 'fail');
  const totalWeight = reasons.reduce((total, reason) => total + reason.weight, 0);
  const knownWeight = known.reduce((total, reason) => total + reason.weight, 0);
  const passedWeight = known.filter((reason) => reason.status === 'pass').reduce((total, reason) => total + reason.weight, 0);
  const evidenceWeight = known.reduce((total, reason) => total + reason.weight * Math.min(1, Math.max(0, facts[reason.criterionKey]?.confidence ?? 1)), 0);
  const score = knownWeight ? Math.round((passedWeight / knownWeight) * 100) : 0;
  const confidence = totalWeight ? Math.round((evidenceWeight / totalWeight) * 100) : 0;
  const hardFailure = reasons.some((reason) => reason.status === 'fail' && reason.requirementLevel === 'hard');
  const missingFacts = reasons.filter((reason) => reason.status === 'unknown');
  let state: OpportunityMatchState = 'low_match';
  if (hardFailure) state = 'ineligible';
  else if (!known.length || (missingFacts.length && confidence < 60)) state = 'needs_information';
  else if (score >= 85) state = 'strong_match';
  else if (score >= 65) state = 'likely_match';
  else if (missingFacts.length && score >= 50) state = 'needs_information';
  return { score, confidence, state, reasons, missingFacts, algorithmVersion: '1.0.0' };
}

const METADATA_ARTWORK_KEYS = ['image_url', 'cover_image_url', 'hero_image_url', 'artwork_url', 'source_image_url', 'og_image_url', 'social_image_url'] as const;
type BundledOpportunityArtwork = ImageSourcePropType | { default: ImageSourcePropType };
export const EARLY_CAREER_PROMOTER_ARTWORK = require('../../../assets/opportunities/early-career-promoter-hero.png') as BundledOpportunityArtwork;
export const OPPORTUNITIES_CREATOR_HERO = require('../../../assets/opportunities/opportunities-creator-hero.webp') as BundledOpportunityArtwork;
const VERIFIED_ARTWORK: Record<string, string> = {
  'neat-spring-2027-rural-touring-call': 'https://neatshows.org.uk/wp-content/uploads/2026/05/Call-Out-Spring-2027.png',
  'river-recordings-field-recording-workshops-2026': 'https://newham-music.org.uk/wp-content/uploads/2026/05/CD-300x200.png',
  'ludlow-song-young-composers-workshop-2026': 'https://ludlowenglishsongweekend.com/wp-content/uploads/2024/11/ludlow-banner-2.webp',
};
const VERIFIED_ORGANISER_LOGOS: Array<{ matches: (organiser: string) => boolean; url: string }> = [
  { matches: (organiser) => organiser.includes('prs foundation'), url: 'https://prsfoundation.com/wp-content/uploads/1970/01/prs-foundation-logotype-red-blue-rgb-small.png' },
  { matches: (organiser) => organiser.includes('north east arts touring') || organiser === 'neat', url: 'https://neatshows.org.uk/wp-content/themes/neats/build/images/logo.svg' },
  { matches: (organiser) => organiser.includes('newham music'), url: 'https://newham-music.org.uk/wp-content/themes/newham/images/logo.png' },
  { matches: (organiser) => organiser.includes('youth music'), url: 'https://www.youthmusic.org.uk/themes/custom/youthmusic/logo.svg' },
];

export function getOpportunityArtwork(opportunity: OpportunityRecord) {
  if (/early[\s-]+career.*promoter/i.test(`${opportunity.slug ?? ''} ${opportunity.title}`)) {
    return EARLY_CAREER_PROMOTER_ARTWORK;
  }
  for (const key of METADATA_ARTWORK_KEYS) {
    const value = opportunity.metadata[key];
    if (typeof value === 'string' && safeOpportunityExternalUrl(value)) return value;
  }
  return (opportunity.slug && VERIFIED_ARTWORK[opportunity.slug]) || null;
}

export function getOpportunityIdentityCandidates(opportunity: OpportunityRecord) {
  const organiser = (opportunity.organiser_name ?? '').trim().toLocaleLowerCase();
  const verifiedLogo = VERIFIED_ORGANISER_LOGOS.find((candidate) => candidate.matches(organiser))?.url ?? null;
  let officialOrigin: string | null = null;
  for (const value of [opportunity.source_url, opportunity.official_application_url, opportunity.guidelines_url]) {
    const safe = safeOpportunityExternalUrl(value);
    if (!safe) continue;
    try { officialOrigin = new URL(safe).origin; } catch { officialOrigin = null; }
    if (officialOrigin) break;
  }
  const candidates = [
    verifiedLogo,
    safeOpportunityExternalUrl(opportunity.organiser_logo_url),
    officialOrigin ? `${officialOrigin}/favicon.ico` : null,
    officialOrigin ? `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(officialOrigin)}&sz=128` : null,
  ];
  return Array.from(new Set(candidates.filter((value): value is string => Boolean(value))));
}

export async function upsertUserOpportunityStatus(userId: string, opportunityId: string, status: UserOpportunityStatus) {
  const now = new Date().toISOString();
  const timestampColumn: Partial<Record<UserOpportunityStatus, string>> = {
    saved: 'saved_at', preparing: 'preparing_at', ready: 'ready_at', applied: 'applied_at',
    successful: 'outcome_at', unsuccessful: 'outcome_at', dismissed: 'dismissed_at',
  };
  const payload: Record<string, unknown> = { user_id: userId, opportunity_id: opportunityId, status };
  const timestamp = timestampColumn[status];
  if (timestamp) payload[timestamp] = now;
  const { data, error } = await (supabase as any)
    .from('user_opportunities')
    .upsert(payload, { onConflict: 'user_id,opportunity_id' })
    .select('id,user_id,opportunity_id,status,saved_at,preparing_at,ready_at,applied_at,outcome_at,updated_at')
    .single();
  if (error) throw error;
  return data as UserOpportunityRecord;
}

export async function saveOpportunityFact({
  userId,
  opportunityId,
  factKey,
  value,
  remember,
}: {
  userId: string;
  opportunityId: string;
  factKey: string;
  value: unknown;
  remember: boolean;
}) {
  const payload = {
    user_id: userId,
    opportunity_id: remember ? null : opportunityId,
    fact_key: factKey,
    value,
    fact_scope: remember ? 'persistent' : 'opportunity',
    source: 'declared',
    confidence: 1,
    is_verified: false,
  };
  const db = supabase as any;
  let existingQuery = db
    .from('user_opportunity_facts')
    .select('id')
    .eq('user_id', userId)
    .eq('fact_key', factKey)
    .eq('fact_scope', payload.fact_scope);
  existingQuery = remember
    ? existingQuery.is('opportunity_id', null)
    : existingQuery.eq('opportunity_id', opportunityId);
  const existing = await existingQuery.maybeSingle();
  if (existing.error && existing.error.code !== 'PGRST116') throw existing.error;
  const writeQuery = existing.data?.id
    ? db.from('user_opportunity_facts').update(payload).eq('id', existing.data.id)
    : db.from('user_opportunity_facts').insert(payload);
  const { data, error } = await writeQuery.select('*').single();
  if (error) throw error;
  return data as UserOpportunityFactRecord;
}

export async function removeSavedOpportunity(userId: string, opportunityId: string) {
  const { error } = await (supabase as any)
    .from('user_opportunities')
    .delete()
    .eq('user_id', userId)
    .eq('opportunity_id', opportunityId)
    .eq('status', 'saved');
  if (error) throw error;
}

export async function setUserOpportunityItem({
  userId,
  opportunityId,
  applicationItemId,
  complete,
  value,
}: {
  userId: string;
  opportunityId: string;
  applicationItemId: string;
  complete: boolean;
  value?: unknown;
}) {
  const { data, error } = await (supabase as any)
    .from('user_opportunity_items')
    .upsert({
      user_id: userId,
      opportunity_id: opportunityId,
      application_item_id: applicationItemId,
      is_complete: complete,
      value: value ?? null,
      completed_at: complete ? new Date().toISOString() : null,
    }, { onConflict: 'user_id,application_item_id' })
    .select('id,user_id,opportunity_id,application_item_id,is_complete,value,completed_at,updated_at')
    .single();
  if (error) throw error;
  return data as UserOpportunityItemRecord;
}

export function formatOpportunityType(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatOpportunityLocation(opportunity: OpportunityRecord) {
  if (opportunity.delivery_mode === 'online') return 'Online';
  return opportunity.location || opportunity.city || (opportunity.delivery_mode === 'hybrid' ? 'Hybrid' : 'Location varies');
}

export function formatOpportunityFunding(opportunity: OpportunityRecord) {
  if (opportunity.funding_min === null && opportunity.funding_max === null) return null;
  const currency = opportunity.currency || 'GBP';
  let format = (value: number) => `${currency} ${Math.round(value).toLocaleString('en-GB')}`;
  try {
    const formatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 });
    format = (value) => formatter.format(value);
  } catch {
    // Keep the truthful currency code fallback for malformed legacy rows.
  }
  if (opportunity.funding_min !== null && opportunity.funding_max !== null) return `${format(opportunity.funding_min)}–${format(opportunity.funding_max)}`;
  if (opportunity.funding_max !== null) return `Up to ${format(opportunity.funding_max)}`;
  return `From ${format(opportunity.funding_min ?? 0)}`;
}

export function formatOpportunityDeadline(opportunity: OpportunityRecord, now = new Date()) {
  const storedDeadline = opportunity.closes_at ?? opportunity.expires_at;
  if (opportunity.rolling_deadline) return 'Rolling deadline';
  if (!storedDeadline) return 'Open deadline';
  const deadline = new Date(storedDeadline);
  if (Number.isNaN(deadline.getTime())) return 'Deadline listed in official guidance';
  const formatted = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(deadline);
  if (deadline.getTime() < now.getTime()) return `Closed ${formatted}`;
  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000);
  if (daysRemaining <= 1) return 'Closes today';
  if (daysRemaining <= 14) return `Closes in ${daysRemaining} days`;
  return `Closes ${formatted}`;
}

export function safeOpportunityExternalUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function calculateOpportunityReadiness(items: OpportunityApplicationItemRecord[], savedItems: UserOpportunityItemRecord[]) {
  const completed = new Set(savedItems.filter((item) => item.is_complete).map((item) => item.application_item_id));
  const required = items.filter((item) => item.is_required);
  const completedRequiredCount = required.filter((item) => completed.has(item.id)).length;
  const requiredCount = required.length;
  return {
    requiredCount,
    completedRequiredCount,
    percentage: requiredCount === 0 ? 100 : Math.round((completedRequiredCount / requiredCount) * 100),
    complete: completedRequiredCount === requiredCount,
  };
}

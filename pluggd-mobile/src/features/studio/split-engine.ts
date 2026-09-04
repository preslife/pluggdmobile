/**
 * Split Engine data layer.
 *
 * The backend owns every rule: percentage maths, validation, approval state and
 * versioning all live in Postgres. This module is a thin, honest client for it.
 *
 * Two things about the schema shape the UI, and both were read off the live
 * policies (`20260510014000_fix_split_engine_rls_recursion.sql`) rather than
 * assumed:
 *
 * 1. `split_agreements` SELECT resolves to owner OR admin OR participant, so an
 *    unfiltered select already returns exactly the agreements you may see.
 * 2. `split_agreement_participants` SELECT resolves to your own row OR
 *    owner/admin. A collaborator who is *not* the owner therefore cannot read
 *    the other participants. For them we render the version snapshot, which
 *    `split_versions` does expose to participants, so an approver always sees
 *    the full split they are agreeing to.
 *
 * Unlike `safeList`/`safeMaybe` in mobileServices, these loaders throw. A silent
 * empty list is how the `public.profiles` RLS gap hid for so long.
 */

import { supabase } from '../../lib/supabase';
import { getCurrentUserId } from '../culture/mobileServices';

const db = supabase as any;

/**
 * Content a split can hang off.
 *
 * Read and write differ here, deliberately. Live agreements exist with
 * `content_type = 'session'`, so the list and detail screens must render it.
 * But `fn_split_engine_owner_user_id` only resolves an owner for beat, release
 * and pack — asking it for a session raises `invalid_content_type` — so those
 * three are the only types we offer when creating. See SPLIT_CONTENT_TYPES.
 */
export type SplitContentType = 'release' | 'beat' | 'pack' | 'session';
export type SplitStatus = 'draft' | 'pending_approval' | 'approved' | 'locked' | 'superseded';
export type SplitApprovalStatus = 'pending' | 'approved' | 'declined';

export type SplitAgreement = {
  id: string;
  content_type: SplitContentType;
  content_id: string;
  owner_user_id: string;
  title: string | null;
  status: SplitStatus;
  active_version_id: string | null;
  last_locked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SplitParticipant = {
  id: string;
  agreement_id: string;
  payee_user_id: string;
  display_name: string | null;
  email: string | null;
  role: string;
  revenue_split: number;
  publishing_split: number;
  content_id_split: number;
  approval_required: boolean;
  created_at: string;
  updated_at: string;
};

export type SplitVersion = {
  id: string;
  agreement_id: string;
  version_number: number;
  status: SplitStatus;
  snapshot: SplitSnapshot | null;
  validation: SplitValidation | null;
  locked_at: string | null;
  locked_by: string | null;
  created_at: string;
};

export type SplitSnapshotParticipant = {
  payee_user_id: string;
  role: string | null;
  revenue_split: number | null;
  publishing_split: number | null;
  content_id_split: number | null;
  approval_required: boolean | null;
  display_name: string | null;
  email: string | null;
};

export type SplitSnapshot = {
  participants?: SplitSnapshotParticipant[];
  submitted_at?: string;
  submitted_by?: string;
};

export type SplitApproval = {
  id: string;
  agreement_id: string;
  version_id: string;
  participant_user_id: string;
  status: SplitApprovalStatus;
  approval_note: string | null;
  responded_at: string | null;
  created_at: string;
};

export type SplitDocument = {
  id: string;
  agreement_id: string;
  version_id: string;
  storage_path: string | null;
  document_hash: string | null;
  generated_at: string | null;
  status: 'generating' | 'ready' | 'failed';
  failure_reason: string | null;
};

/** Shape returned by `fn_validate_split_agreement`. */
export type SplitValidation = {
  agreement_id: string;
  participants_count: number;
  totals: { revenue: number; publishing: number; content_id: number };
  valid: boolean;
  checks: {
    revenue_100: boolean;
    publishing_100: boolean;
    content_id_100: boolean;
    has_participants: boolean;
  };
};

export type SplitOverview = {
  owner_user_id: string;
  generated_at: string;
  totals: {
    total_agreements_count: number;
    active_agreements_count: number;
    locked_agreements_count: number;
    pending_approvals_count: number;
    split_secured_content_count: number;
    revenue_allocated_cents: number;
  };
  top_collaborators: Array<{
    user_id: string;
    display_name: string;
    agreements_count: number;
    average_split_percent: number;
    payout_cents: number;
  }>;
};

export type SplitPerson = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
};

export type OwnedContent = {
  id: string;
  title: string;
  type: CreatableContentType;
  artwork: string | null;
  created_at: string | null;
  /** Set when this piece of content already has an agreement. */
  agreement_id?: string;
};

export type SplitListData = {
  userId: string;
  overview: SplitOverview | null;
  /** Agreements this creator owns. */
  owned: SplitAgreement[];
  /** Agreements this creator was added to by someone else. */
  collaborating: SplitAgreement[];
  /** Versions awaiting this creator's response, newest first. */
  awaitingMe: Array<{ agreement: SplitAgreement; approval: SplitApproval }>;
};

export type SplitDetailData = {
  userId: string;
  agreement: SplitAgreement;
  /** True when the signed-in user owns the agreement and may edit it. */
  canManage: boolean;
  /**
   * Live participant rows. Complete for the owner; for a collaborator RLS
   * returns only their own row, so `snapshotParticipants` is the honest view.
   */
  participants: SplitParticipant[];
  /** Participants read from the latest submitted version snapshot. */
  snapshotParticipants: SplitSnapshotParticipant[];
  versions: SplitVersion[];
  approvals: SplitApproval[];
  documents: SplitDocument[];
  people: Record<string, SplitPerson>;
  myApproval: SplitApproval | null;
  latestVersion: SplitVersion | null;
};

/** Types a creator may start a new sheet on. */
export const SPLIT_CONTENT_TYPES: Array<{ value: CreatableContentType; label: string; icon: string }> = [
  { value: 'release', label: 'Release', icon: 'album' },
  { value: 'beat', label: 'Beat', icon: 'graphic-eq' },
  { value: 'pack', label: 'Sample pack', icon: 'library-music' },
];

export type CreatableContentType = 'release' | 'beat' | 'pack';

/** Labels for every type that can come back from the server, creatable or not. */
export const SPLIT_CONTENT_LABELS: Record<SplitContentType, string> = {
  release: 'Release',
  beat: 'Beat',
  pack: 'Sample pack',
  session: 'Session',
};

export const SPLIT_ROLES = ['artist', 'producer', 'songwriter', 'featured', 'engineer', 'manager', 'collaborator'];

/** Server error codes are raised as bare strings; translate them for humans. */
const ERROR_COPY: Record<string, string> = {
  not_authenticated: 'Sign in again to continue.',
  content_not_found: 'That work could not be found.',
  owner_mismatch: 'That work belongs to another account.',
  not_content_owner: 'Only the owner of this work can change its split.',
  agreement_not_found: 'This split sheet no longer exists.',
  split_validation_failed: 'Every column has to total exactly 100% before you can send this out.',
  approval_not_permitted: 'You are not listed on this split sheet.',
  version_not_found: 'There is no version to respond to yet.',
  approved_version_required: 'Collect every approval before locking.',
  invalid_content_type: 'Splits can be created on releases, beats and sample packs.',
};

export function splitErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  for (const [code, copy] of Object.entries(ERROR_COPY)) {
    if (raw.includes(code)) return copy;
  }
  return raw || 'Something went wrong. Try again.';
}

export const SPLIT_STATUS_COPY: Record<SplitStatus, { label: string; tone: 'native' | 'limited' | 'neutral' }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  pending_approval: { label: 'Awaiting approvals', tone: 'limited' },
  approved: { label: 'Approved', tone: 'native' },
  locked: { label: 'Locked', tone: 'native' },
  superseded: { label: 'Superseded', tone: 'neutral' },
};

function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeParticipant(row: any): SplitParticipant {
  return {
    ...row,
    revenue_split: toNumber(row?.revenue_split),
    publishing_split: toNumber(row?.publishing_split),
    content_id_split: toNumber(row?.content_id_split),
  };
}

/** Throws on error rather than collapsing an RLS denial into an empty list. */
async function rows<T>(query: PromiseLike<{ data: unknown; error: any }>, label: string): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message ?? String(error)}`);
  return Array.isArray(data) ? (data as T[]) : [];
}

const AGREEMENT_COLUMNS =
  'id, content_type, content_id, owner_user_id, title, status, active_version_id, last_locked_at, created_at, updated_at';

async function loadPeople(userIds: string[]): Promise<Record<string, SplitPerson>> {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return {};
  // public_profiles is the anon-safe projection the app standardised on after
  // the profiles RLS gap; it carries everything the collaborator rows need.
  const { data, error } = await db
    .from('public_profiles')
    .select('user_id, username, full_name, avatar_url, is_verified')
    .in('user_id', unique);
  if (error) return {};
  const map: Record<string, SplitPerson> = {};
  for (const person of (data ?? []) as SplitPerson[]) map[person.user_id] = person;
  return map;
}

export function personLabel(person: SplitPerson | undefined, fallback?: string | null): string {
  return person?.full_name || person?.username || fallback || 'Collaborator';
}

export async function loadSplitList(): Promise<SplitListData> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('not_authenticated');

  // RLS already narrows this to agreements you own or appear on.
  const agreements = await rows<SplitAgreement>(
    db.from('split_agreements').select(AGREEMENT_COLUMNS).order('updated_at', { ascending: false }).limit(100),
    'split_agreements',
  );

  const { data: overviewData } = await db.rpc('fn_get_split_engine_overview', {});

  const owned = agreements.filter((row) => row.owner_user_id === userId);
  const collaborating = agreements.filter((row) => row.owner_user_id !== userId);

  const myApprovals = await rows<SplitApproval>(
    db
      .from('split_approvals')
      .select('id, agreement_id, version_id, participant_user_id, status, approval_note, responded_at, created_at')
      .eq('participant_user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    'split_approvals',
  );

  const byId = new Map(agreements.map((row) => [row.id, row]));
  const awaitingMe = myApprovals
    .map((approval) => {
      const agreement = byId.get(approval.agreement_id);
      return agreement ? { agreement, approval } : null;
    })
    .filter((entry): entry is { agreement: SplitAgreement; approval: SplitApproval } => entry !== null);

  return {
    userId,
    overview: (overviewData as SplitOverview | null) ?? null,
    owned,
    collaborating,
    awaitingMe,
  };
}

export async function loadSplitDetail(agreementId: string): Promise<SplitDetailData> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('not_authenticated');

  const { data: agreementRow, error: agreementError } = await db
    .from('split_agreements')
    .select(AGREEMENT_COLUMNS)
    .eq('id', agreementId)
    .maybeSingle();
  if (agreementError) throw new Error(`split_agreements: ${agreementError.message}`);
  if (!agreementRow) throw new Error('agreement_not_found');

  const agreement = agreementRow as SplitAgreement;
  const canManage = agreement.owner_user_id === userId;

  const [participantRows, versions, approvals, documents] = await Promise.all([
    rows<any>(
      db
        .from('split_agreement_participants')
        .select(
          'id, agreement_id, payee_user_id, display_name, email, role, revenue_split, publishing_split, content_id_split, approval_required, created_at, updated_at',
        )
        .eq('agreement_id', agreementId)
        .order('created_at', { ascending: true }),
      'split_agreement_participants',
    ),
    rows<SplitVersion>(
      db
        .from('split_versions')
        .select('id, agreement_id, version_number, status, snapshot, validation, locked_at, locked_by, created_at')
        .eq('agreement_id', agreementId)
        .order('version_number', { ascending: false }),
      'split_versions',
    ),
    rows<SplitApproval>(
      db
        .from('split_approvals')
        .select('id, agreement_id, version_id, participant_user_id, status, approval_note, responded_at, created_at')
        .eq('agreement_id', agreementId)
        .order('created_at', { ascending: false }),
      'split_approvals',
    ),
    rows<SplitDocument>(
      db
        .from('split_documents')
        .select('id, agreement_id, version_id, storage_path, document_hash, generated_at, status, failure_reason')
        .eq('agreement_id', agreementId)
        .order('generated_at', { ascending: false }),
      'split_documents',
    ),
  ]);

  const participants = participantRows.map(normalizeParticipant);

  // The newest version that actually carries a participant snapshot.
  const latestVersion = versions[0] ?? null;
  const snapshotSource =
    versions.find((version) => (version.snapshot?.participants?.length ?? 0) > 0) ?? null;
  const snapshotParticipants = (snapshotSource?.snapshot?.participants ?? []).map((entry) => ({
    ...entry,
    revenue_split: toNumber(entry.revenue_split),
    publishing_split: toNumber(entry.publishing_split),
    content_id_split: toNumber(entry.content_id_split),
  }));

  const people = await loadPeople([
    agreement.owner_user_id,
    ...participants.map((row) => row.payee_user_id),
    ...snapshotParticipants.map((row) => row.payee_user_id),
    ...approvals.map((row) => row.participant_user_id),
  ]);

  const activeVersionId = latestVersion?.id ?? null;
  const myApproval =
    approvals.find((row) => row.participant_user_id === userId && row.version_id === activeVersionId) ??
    approvals.find((row) => row.participant_user_id === userId) ??
    null;

  return {
    userId,
    agreement,
    canManage,
    participants,
    snapshotParticipants,
    versions,
    approvals,
    documents,
    people,
    myApproval,
    latestVersion,
  };
}

/**
 * Content this creator owns that a split can be attached to. Only the three
 * types `fn_split_engine_owner_user_id` can resolve are offered — anything else
 * raises `invalid_content_type` server-side.
 */
export async function loadOwnedContent(): Promise<OwnedContent[]> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('not_authenticated');

  const [releases, beats, packs, agreements] = await Promise.all([
    rows<any>(
      db.from('releases').select('id, title, cover_art_url, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      'releases',
    ),
    rows<any>(
      db.from('beats').select('id, title, image_url, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      'beats',
    ),
    rows<any>(
      db.from('sample_packs').select('id, title, cover_art_url, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      'sample_packs',
    ),
    rows<SplitAgreement>(db.from('split_agreements').select('id, content_type, content_id').limit(200), 'split_agreements'),
  ]);

  const existing = new Map(agreements.map((row) => [`${row.content_type}:${row.content_id}`, row.id]));
  const decorate = (item: OwnedContent): OwnedContent => {
    const agreementId = existing.get(`${item.type}:${item.id}`);
    return agreementId ? { ...item, agreement_id: agreementId } : item;
  };

  return [
    ...releases.map((row) =>
      decorate({ id: row.id, title: row.title || 'Untitled release', type: 'release', artwork: row.cover_art_url ?? null, created_at: row.created_at }),
    ),
    ...beats.map((row) =>
      decorate({ id: row.id, title: row.title || 'Untitled beat', type: 'beat', artwork: row.image_url ?? null, created_at: row.created_at }),
    ),
    ...packs.map((row) =>
      decorate({ id: row.id, title: row.title || 'Untitled pack', type: 'pack', artwork: row.cover_art_url ?? null, created_at: row.created_at }),
    ),
  ].sort((left, right) => String(right.created_at ?? '').localeCompare(String(left.created_at ?? '')));
}

export async function searchCollaborators(term: string): Promise<SplitPerson[]> {
  const query = term.trim();
  if (query.length < 2) return [];
  const escaped = query.replace(/[%,()]/g, ' ').trim();
  if (!escaped) return [];
  const { data, error } = await db
    .from('public_profiles')
    .select('user_id, username, full_name, avatar_url, is_verified')
    .or(`full_name.ilike.%${escaped}%,username.ilike.%${escaped}%`)
    .limit(15);
  if (error) throw new Error(`public_profiles: ${error.message}`);
  return (data ?? []) as SplitPerson[];
}

async function callRpc<T>(name: string, params: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.rpc(name, params);
  if (error) throw new Error(error.message ?? String(error));
  return data as T;
}

export function createSplitAgreement(contentType: CreatableContentType, contentId: string) {
  return callRpc<string>('fn_create_split_agreement', { p_content_type: contentType, p_content_id: contentId });
}

export function upsertSplitParticipant(input: {
  agreementId: string;
  payeeUserId: string;
  role: string;
  revenue: number;
  publishing: number;
  contentId: number;
  displayName?: string | null;
  email?: string | null;
  approvalRequired: boolean;
}) {
  return callRpc<string>('fn_upsert_split_participant', {
    p_agreement_id: input.agreementId,
    p_payee_user_id: input.payeeUserId,
    p_role: input.role,
    p_revenue_split: input.revenue,
    p_publishing_split: input.publishing,
    p_content_id_split: input.contentId,
    p_display_name: input.displayName ?? null,
    p_email: input.email ?? null,
    p_approval_required: input.approvalRequired,
  });
}

export function deleteSplitParticipant(agreementId: string, payeeUserId: string) {
  return callRpc<void>('fn_delete_split_participant', { p_agreement_id: agreementId, p_payee_user_id: payeeUserId });
}

export function validateSplitAgreement(agreementId: string) {
  return callRpc<SplitValidation>('fn_validate_split_agreement', { p_agreement_id: agreementId });
}

export function submitSplitForApproval(agreementId: string) {
  return callRpc<string>('fn_submit_split_for_approval', { p_agreement_id: agreementId });
}

export function approveSplit(agreementId: string, versionId: string | null, approve: boolean, note?: string) {
  return callRpc<string>('fn_approve_split', {
    p_agreement_id: agreementId,
    p_version_id: versionId,
    p_approve: approve,
    p_note: note?.trim() ? note.trim() : null,
  });
}

export function lockSplitVersion(agreementId: string, versionId: string | null) {
  return callRpc<string>('fn_lock_split_version', { p_agreement_id: agreementId, p_version_id: versionId });
}

/**
 * Client-side mirror of `fn_validate_split_agreement` so the sheet can show a
 * running total as the creator types. The server remains the authority — this
 * only decides whether the Send button is worth enabling.
 */
export function localTotals(
  participants: Array<{ revenue_split: number; publishing_split: number; content_id_split: number }>,
) {
  const revenue = participants.reduce((sum, row) => sum + toNumber(row.revenue_split), 0);
  const publishing = participants.reduce((sum, row) => sum + toNumber(row.publishing_split), 0);
  const contentId = participants.reduce((sum, row) => sum + toNumber(row.content_id_split), 0);
  const at100 = (value: number) => Math.abs(value - 100) <= 0.01;
  return {
    revenue,
    publishing,
    contentId,
    revenueValid: at100(revenue),
    publishingValid: at100(publishing),
    contentIdValid: at100(contentId),
    valid: participants.length > 0 && at100(revenue) && at100(publishing) && at100(contentId),
  };
}

/** Splits 100% across `count` people, giving the remainder to the first row. */
export function evenSplit(count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor((100 / count) * 1000) / 1000;
  const shares = new Array(count).fill(base);
  const remainder = Math.round((100 - base * count) * 1000) / 1000;
  shares[0] = Math.round((shares[0] + remainder) * 1000) / 1000;
  return shares;
}

export function formatPercent(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(2).replace(/0$/, '')}%`;
}

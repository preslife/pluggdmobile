import { supabase } from '../../lib/supabase';

export type SplitJoinPreview = {
  status: 'active' | 'closed' | 'expired' | 'not_found';
  title?: string;
  hostName?: string;
  location?: string | null;
  notes?: string | null;
  participantCount?: number;
  expiresAt?: string;
  allowIncompleteConnectCard?: boolean;
};
export type SplitJoinResult = {
  status: 'joined' | 'already_joined';
  agreementId: string;
  displayName: string;
  role: string;
};

export async function loadSplitJoinPreview(token: string): Promise<SplitJoinPreview> {
  if (!token || token.length > 512) return { status: 'not_found' };
  const { data, error } = await (supabase as any).rpc('get_split_join_session_public', { p_join_token: token });
  if (error) throw new Error('This invitation could not be loaded. Please try again.');
  if (!data || !['active', 'closed', 'expired', 'not_found'].includes(data.status)) {
    throw new Error('This invitation could not be loaded. Please try again.');
  }
  return data;
}

export async function joinSplitWithConnectCard(token: string, source: string): Promise<SplitJoinResult> {
  const { data, error } = await (supabase as any).rpc('join_split_session_from_connect_card', {
    p_join_token: token,
    p_source: ['qr', 'nfc', 'connect_card'].includes(source) ? source : 'link',
  });
  if (error) {
    const message = String(error.message ?? '');
    if (message.includes('split_details_required')) throw new Error('Complete your legal name, artist or display name, contact email and split role on your Connect Card, then return to this invitation.');
    if (/join_session_inactive|join_session_not_found|agreement_not_open_for_join/.test(message)) throw new Error('This invitation is no longer open. Ask the host for a fresh link.');
    throw new Error('Your details could not be added. Check your connection and try again.');
  }
  if (!data?.agreementId || !['joined', 'already_joined'].includes(data.status)) throw new Error('Your details could not be confirmed. Please try again.');
  return data;
}

export async function loadSplitApprovalAgreement(approvalId: string, userId: string): Promise<string> {
  const { data, error } = await (supabase as any).from('split_approvals')
    .select('agreement_id').eq('id', approvalId).eq('participant_user_id', userId).maybeSingle();
  if (error || !data?.agreement_id) throw new Error('This split approval is unavailable for your account.');
  return data.agreement_id;
}


export type HostedSplitSession = {
  sessionId: string;
  agreementId: string;
  joinToken: string;
  title: string;
  expiresAt: string;
  joinSessionStatus: 'active' | 'closed' | 'expired';
  agreementStatus: string;
  participantCount: number;
  location?: string | null;
  notes?: string | null;
};

/** Only first-party invitation links are accepted. A scan never performs a join. */
export function parseSplitInvitation(value: string): string | null {
  if (value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || !['pluggd.fm', 'pluggd.live', 'www.pluggd.fm', 'www.pluggd.live'].includes(url.hostname.toLowerCase()) || url.username || url.password || url.port) return null;
    const match = /^\/split\/join\/([a-f0-9]{48})\/?$/i.exec(url.pathname);
    return match?.[1] ?? null;
  } catch { return null; }
}

export function splitInvitationUrl(token: string, source: 'qr' | 'link'): string {
  if (!/^[a-f0-9]{48}$/i.test(token)) throw new Error('This invitation is unavailable.');
  return `https://pluggd.fm/split/join/${token}?source=${source}`;
}

export async function loadHostedSplitSessions(): Promise<HostedSplitSession[]> {
  const { data, error } = await (supabase as any).rpc('get_my_split_join_sessions', { p_limit: 50 });
  if (error || !Array.isArray(data)) throw new Error('Your invitations could not be loaded. Please try again.');
  return data.filter((row: HostedSplitSession) => row?.sessionId && row.agreementId && /^[a-f0-9]{48}$/i.test(row.joinToken));
}

export async function hostSplitSession(input: { title: string; location: string; notes: string; expiresMinutes: number }): Promise<HostedSplitSession> {
  const title = input.title.trim();
  if (!title || title.length > 200) throw new Error('Enter a session title of up to 200 characters.');
  const { data, error } = await (supabase as any).rpc('create_split_join_session', {
    p_title: title,
    p_content_kind: 'session',
    p_content_link: null,
    p_expires_minutes: [60, 1440, 10080].includes(input.expiresMinutes) ? input.expiresMinutes : 1440,
    p_location: input.location.trim().slice(0, 160) || null,
    p_notes: input.notes.trim().slice(0, 1000) || null,
    p_expected_participants: [],
    p_allow_incomplete_connect_card: false,
  });
  if (error || data?.status !== 'ok' || !data.sessionId || !data.agreementId || !/^[a-f0-9]{48}$/i.test(data.joinToken)) {
    // A lost response can follow a successful write. Never silently repeat this RPC.
    throw new Error('We could not confirm the new sheet. Check your recent invitations below before creating another.');
  }
  return { ...data, joinSessionStatus: 'active', agreementStatus: 'draft', participantCount: 1 };
}

export async function closeHostedSplitSession(sessionId: string): Promise<void> {
  const { data, error } = await (supabase as any).rpc('close_split_join_session', { p_session_id: sessionId });
  if (error || data?.status !== 'closed') throw new Error('The invitation could not be closed. Refresh and try again.');
}

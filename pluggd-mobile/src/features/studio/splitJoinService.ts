import { supabase } from '../../lib/supabase';

export type SplitJoinPreview = {
  status: 'active' | 'closed' | 'expired' | 'not_found';
  title?: string;
  hostName?: string;
  location?: string | null;
  notes?: string | null;
  participantCount?: number;
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

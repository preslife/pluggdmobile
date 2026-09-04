import { supabase } from '../../lib/supabase';

export type AgeBand = 'under_16' | '16_plus' | '18_plus';

export type AccountSafetySettings = {
  ageBand: AgeBand | null;
  sensitiveContentEnabled: boolean;
};

export function canShowSensitiveContent(settings: AccountSafetySettings) {
  return settings.sensitiveContentEnabled
    && (settings.ageBand === '16_plus' || settings.ageBand === '18_plus');
}

export type BlockedAccount = {
  blockId: string;
  userId: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  blockedAt: string;
};

async function invoke<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export async function blockUser(blockedUserId: string, reason = 'User requested block') {
  return invoke<{ block: { id: string } }>('block-user', {
    blockedUserId,
    reason,
    context: { surface: 'ios_app' },
  });
}

export async function unblockUser(blockedUserId: string) {
  return invoke<{ success: boolean }>('unblock-user', { blockedUserId });
}

export async function reportContent(input: {
  targetType: 'release' | 'beat' | 'post' | 'profile' | 'comment' | 'blog_post' | 'story';
  targetId: string;
  reason: string;
  details?: string;
}) {
  return invoke<{ report: { id: string }; duplicate?: boolean }>('submit-report', {
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    description: input.details?.trim() || undefined,
  });
}

export async function loadBlockedUserIds(): Promise<Set<string>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Set();
  const { data, error } = await (supabase as any)
    .from('user_blocks')
    .select('blocked_user_id')
    .eq('blocker_id', auth.user.id)
    .eq('status', 'active');
  if (error) throw error;
  return new Set((data ?? []).map((row: any) => row.blocked_user_id));
}

export async function listBlockedAccounts(): Promise<BlockedAccount[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data: blocks, error } = await (supabase as any)
    .from('user_blocks')
    .select('id,blocked_user_id,created_at')
    .eq('blocker_id', auth.user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const ids = (blocks ?? []).map((row: any) => row.blocked_user_id);
  if (!ids.length) return [];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id,full_name,username,avatar_url')
    .in('user_id', ids);
  const byId = new Map((profiles ?? []).map((profile: any) => [profile.user_id, profile]));
  return (blocks ?? []).map((row: any) => {
    const profile: any = byId.get(row.blocked_user_id);
    return {
      blockId: row.id,
      userId: row.blocked_user_id,
      name: profile?.full_name || profile?.username || 'PLUGGD member',
      username: profile?.username ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      blockedAt: row.created_at,
    };
  });
}

export async function loadSafetySettings(): Promise<AccountSafetySettings> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ageBand: null, sensitiveContentEnabled: false };
  const { data, error } = await (supabase as any)
    .from('account_safety_settings')
    .select('age_band,sensitive_content_enabled')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return {
    ageBand: (data?.age_band as AgeBand | null) ?? null,
    sensitiveContentEnabled: Boolean(data?.sensitive_content_enabled && data?.age_band !== 'under_16'),
  };
}

export async function updateSafetySettings(next: AccountSafetySettings) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sign in to update safety settings.');
  const sensitive = next.ageBand === 'under_16' ? false : next.sensitiveContentEnabled;
  const { error } = await (supabase as any)
    .from('account_safety_settings')
    .upsert({
      user_id: auth.user.id,
      age_band: next.ageBand,
      sensitive_content_enabled: sensitive,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
}

export async function requestDataExport() {
  return invoke<{ requestId: string; downloadUrl: string; expiresAt: string }>('export-my-data');
}

export async function deleteMyAccount(input: {
  confirmation: string;
  acknowledgeSubscription: boolean;
}) {
  let lastError: unknown = null;

  // Deletion is deliberately idempotent. If the function completed but its
  // response was lost, the server-side auth check below turns that outcome
  // into success. A single retry also recovers a transient 5xx after partial
  // cleanup without asking the reviewer to repeat the destructive flow.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data, error } = await supabase.functions.invoke('delete-account', { body: input });
    if (!error && data?.deleted) return data as { deleted: boolean };

    if (error) {
      lastError = error;
      const { data: authCheck } = await supabase.auth.getUser();
      if (!authCheck.user) return { deleted: true };

      const response = (error as any)?.context;
      const status = typeof response?.status === 'number' ? response.status : null;
      if (attempt === 0 && (status === null || status >= 500)) continue;

      let serverMessage: string | null = null;
      try {
        const payload = await response?.clone?.().json?.();
        serverMessage = typeof payload?.error === 'string' ? payload.error : null;
      } catch {
        // The SDK may already have consumed the response body. Its original
        // error remains the safest fallback in that case.
      }
      if (serverMessage) throw new Error(serverMessage);
    } else if (data?.error) {
      throw new Error(data.error);
    }
  }

  throw lastError ?? new Error('We could not complete account deletion. Please try again.');
}

export async function moderateUserContent(input: {
  contentKind: string;
  text: string;
  mediaUrls?: string[];
  destination?: Record<string, unknown>;
}) {
  return invoke<{ decision: 'allow' | 'review' | 'reject'; message?: string; submissionId?: string }>(
    'moderate-user-content',
    input,
  );
}

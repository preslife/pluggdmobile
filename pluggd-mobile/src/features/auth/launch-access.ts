import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { supabaseStorage } from '../../lib/storage';

const PENDING_ACCESS_CODE_KEY = 'pluggd_pending_access_code';
const LAUNCH_ACCESS_NOTICE_KEY = 'pluggd_launch_access_notice';

type AccessValidationResponse = {
  valid?: boolean;
  success?: boolean;
  message?: string;
  remaining_uses?: number;
  code_type?: string;
};

type LaunchAccessResponse = {
  allowed?: boolean;
  message?: string;
};

export type AccessCodeValidation = {
  valid: boolean;
  code: string;
  message: string;
  remainingUses?: number;
  codeType?: string;
};

export type LaunchAccessResult = {
  allowed: boolean;
  message?: string;
};

export function normalizeAccessCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

export async function storePendingAccessCode(code: string) {
  const normalized = normalizeAccessCode(code);
  if (!normalized) return null;

  await supabaseStorage.setItem(PENDING_ACCESS_CODE_KEY, normalized);
  return normalized;
}

export async function peekPendingAccessCode() {
  return supabaseStorage.getItem(PENDING_ACCESS_CODE_KEY);
}

export async function consumePendingAccessCode() {
  const code = await peekPendingAccessCode();
  if (code) {
    await supabaseStorage.removeItem(PENDING_ACCESS_CODE_KEY);
  }
  return code;
}

export async function storeLaunchAccessNotice(message: string) {
  await supabaseStorage.setItem(LAUNCH_ACCESS_NOTICE_KEY, message);
}

export async function consumeLaunchAccessNotice() {
  const message = await supabaseStorage.getItem(LAUNCH_ACCESS_NOTICE_KEY);
  if (message) {
    await supabaseStorage.removeItem(LAUNCH_ACCESS_NOTICE_KEY);
  }
  return message;
}

export async function validateAccessCode(code: string, email?: string | null): Promise<AccessCodeValidation> {
  const normalized = normalizeAccessCode(code);

  const { data, error } = await supabase.rpc('platform_validate_access_code' as any, {
    p_code: normalized || null,
    p_email: email ?? null,
  } as any);

  if (error) throw error;

  const payload = (data && typeof data === 'object' ? data : {}) as AccessValidationResponse;
  const valid = payload.valid === true || payload.success === true;

  return {
    valid,
    code: normalized,
    message: payload.message ?? (valid ? 'Access code accepted.' : 'That access code is not valid.'),
    remainingUses: payload.remaining_uses,
    codeType: payload.code_type,
  };
}

export async function redeemAccessCode(code: string, session: Session) {
  const normalized = normalizeAccessCode(code);
  if (!normalized) return false;

  const { data, error } = await supabase.rpc('platform_redeem_access_code' as any, {
    p_code: normalized,
    p_email: session.user.email ?? null,
    p_user_id: session.user.id,
  } as any);

  if (error) throw error;

  const payload = (data && typeof data === 'object' ? data : {}) as AccessValidationResponse;
  return payload.success === true || payload.valid === true;
}

export async function syncPreaccessProfile(session: Session) {
  if (!session.user.email) return;

  try {
    await supabase.rpc('preaccess_sync_profile_from_submission' as any, {
      p_user_id: session.user.id,
      p_email: session.user.email,
    } as any);
  } catch (error) {
    console.warn('[launch-access] preaccess profile sync skipped:', error);
  }
}

async function redeemPendingAccessCode(session: Session) {
  const pendingCode = await peekPendingAccessCode();
  if (!pendingCode) return;

  try {
    await redeemAccessCode(pendingCode, session);
  } catch (error) {
    console.warn('[launch-access] pending access code redemption failed:', error);
  } finally {
    await consumePendingAccessCode();
  }
}

export async function enforceLaunchAccess(session: Session | null): Promise<LaunchAccessResult> {
  if (!session?.user) return { allowed: true };

  await redeemPendingAccessCode(session);

  const createdAtRaw = session.user.created_at;
  const createdAt =
    typeof createdAtRaw === 'string' && !Number.isNaN(Date.parse(createdAtRaw))
      ? new Date(createdAtRaw).toISOString()
      : null;

  try {
    const { data, error } = await supabase.rpc('platform_user_has_launch_access' as any, {
      p_user_id: session.user.id,
      p_email: session.user.email ?? null,
      p_user_created_at: createdAt,
    } as any);

    if (error) {
      console.warn('[launch-access] launch access check failed:', error);
      return { allowed: true };
    }

    const payload = (data && typeof data === 'object' ? data : {}) as LaunchAccessResponse;

    if (payload.allowed === true) {
      await syncPreaccessProfile(session);
      return { allowed: true };
    }

    return {
      allowed: false,
      message: payload.message ?? 'Access code required for new accounts during early access.',
    };
  } catch (error) {
    console.warn('[launch-access] unexpected launch access failure:', error);
    return { allowed: true };
  }
}

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { ContentGateType, ContentType, OwnerType } from '@/types/memberships';

const now = () => (typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now());

export interface MembershipAccessRule {
  gate_type: ContentGateType;
  minimum_tier_id: string | null;
  allowed_tier_ids: string[] | null;
  preview_text: string | null;
  preview_duration: number | null;
  owner_id: string | null;
  owner_type: OwnerType | null;
}

export interface UpsertMembershipAccessRuleInput {
  contentId: string;
  contentType: ContentType;
  ownerId: string;
  ownerType: OwnerType;
  gateType: ContentGateType;
  minimumTierId: string | null;
  allowedTierIds: string[] | null;
  previewText: string | null;
  previewDuration: number | null;
}

export const fetchMembershipAccessRules = async (
  contentType: ContentType,
  contentId: string
): Promise<MembershipAccessRule | null> => {
  if (!contentId) return null;

  const started = now();
  const { data, error } = await supabase.rpc('get_membership_access_rules', {
    p_content_type: contentType,
    p_content_id: contentId,
  });
  const duration = now() - started;

  void logger.apiCall('rpc', 'get_membership_access_rules', duration, error ? 500 : 200, {
    contentType,
    contentId,
  });

  if (error) {
    void logger.error('membership_access_rules_fetch_failed', {
      contentType,
      contentId,
      error: error.message,
    });
    throw error;
  }

  return (data as MembershipAccessRule | null) ?? null;
};

export const upsertMembershipAccessRules = async ({
  contentId,
  contentType,
  ownerId,
  ownerType,
  gateType,
  minimumTierId,
  allowedTierIds,
  previewText,
  previewDuration,
}: UpsertMembershipAccessRuleInput) => {
  const started = now();
  const { error } = await supabase.rpc('upsert_membership_access_rules', {
    p_content_id: contentId,
    p_content_type: contentType,
    p_owner_id: ownerId,
    p_owner_type: ownerType,
    p_gate_type: gateType,
    p_minimum_tier_id: minimumTierId,
    p_allowed_tier_ids: allowedTierIds,
    p_preview_text: previewText,
    p_preview_duration: previewDuration,
  });
  const duration = now() - started;

  void logger.apiCall('rpc', 'upsert_membership_access_rules', duration, error ? 500 : 200, {
    contentType,
    contentId,
    gateType,
  });

  if (error) {
    void logger.error('membership_access_rules_upsert_failed', {
      contentType,
      contentId,
      error: error.message,
    });
    throw error;
  }
};

export const deleteMembershipAccessRules = async (
  contentType: ContentType,
  contentId: string
) => {
  if (!contentId) return;

  const started = now();
  const { error } = await supabase.rpc('delete_membership_access_rules', {
    p_content_type: contentType,
    p_content_id: contentId,
  });
  const duration = now() - started;

  void logger.apiCall('rpc', 'delete_membership_access_rules', duration, error ? 500 : 200, {
    contentType,
    contentId,
  });

  if (error) {
    void logger.error('membership_access_rules_delete_failed', {
      contentType,
      contentId,
      error: error.message,
    });
    throw error;
  }
};

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { ContentGateType, ContentType, OwnerType } from '@/types/memberships';
import {
  deleteMembershipAccessRules,
  fetchMembershipAccessRules,
  upsertMembershipAccessRules,
} from '@/services/memberships/accessRules';

export interface SimpleMembershipTier {
  id: string;
  name: string;
  tier_order: number;
  status: string;
  price_monthly: number | null;
  price_yearly: number | null;
  price_lifetime: number | null;
  currency: string | null;
}

export interface MembershipOwnerResolution {
  ownerType: OwnerType | null;
  ownerId: string | null;
}

interface UseMembershipAccessRuleEditorOptions {
  contentType: ContentType;
  resolveOwner: () => MembershipOwnerResolution;
}

interface UseMembershipAccessRuleEditorResult {
  availableTiers: SimpleMembershipTier[];
  tiersLoading: boolean;
  gateEnabled: boolean;
  setGateEnabled: (value: boolean) => void;
  gateType: ContentGateType;
  setGateType: (value: ContentGateType) => void;
  minimumTierId: string | null;
  setMinimumTierId: (value: string | null) => void;
  allowedTierIds: string[];
  setAllowedTierIds: (value: string[]) => void;
  previewText: string;
  setPreviewText: (value: string) => void;
  previewDuration: string;
  setPreviewDuration: (value: string) => void;
  loadRulesFor: (contentId: string) => Promise<void>;
  saveRulesFor: (contentId: string) => Promise<void>;
  deleteRulesFor: (contentId: string) => Promise<void>;
}

const ensureArray = (value: string[] | null | undefined): string[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [];
};

export const useMembershipAccessRuleEditor = ({
  contentType,
  resolveOwner,
}: UseMembershipAccessRuleEditorOptions): UseMembershipAccessRuleEditorResult => {
  const [availableTiers, setAvailableTiers] = useState<SimpleMembershipTier[]>([]);
  const [tiersLoading, setTiersLoading] = useState(false);

  const [gateEnabled, setGateEnabled] = useState(false);
  const [gateType, setGateType] = useState<ContentGateType>('tier_or_higher');
  const [minimumTierId, setMinimumTierId] = useState<string | null>(null);
  const [allowedTierIds, setAllowedTierIds] = useState<string[]>([]);
  const [previewText, setPreviewText] = useState('');
  const [previewDuration, setPreviewDuration] = useState('');

  const resetState = useCallback(() => {
    setGateEnabled(false);
    setGateType('tier_or_higher');
    setMinimumTierId(null);
    setAllowedTierIds([]);
    setPreviewText('');
    setPreviewDuration('');
  }, []);

  const owner = useMemo(() => resolveOwner(), [resolveOwner]);

  const loadTiers = useCallback(
    async (ownerType: OwnerType | null, ownerId: string | null) => {
      if (!ownerType || !ownerId) {
        setAvailableTiers([]);
        return;
      }

      setTiersLoading(true);

      const { data, error } = await supabase
        .from('membership_tiers')
        .select('id, name, tier_order, status, price_monthly, price_yearly, price_lifetime, currency')
        .eq('owner_type', ownerType)
        .eq('owner_id', ownerId)
        .eq('status', 'active')
        .order('tier_order', { ascending: true });

      if (error) {
        void logger.error('membership_tier_load_failed', {
          ownerType,
          ownerId,
          error: error.message,
        });
        setAvailableTiers([]);
      } else {
        setAvailableTiers((data as SimpleMembershipTier[]) ?? []);
      }

      setTiersLoading(false);
    },
    []
  );

  useEffect(() => {
    void loadTiers(owner.ownerType, owner.ownerId);
  }, [loadTiers, owner.ownerId, owner.ownerType]);

  useEffect(() => {
    if (!gateEnabled) return;

    if (gateType === 'tier_or_higher') {
      if (!minimumTierId || !availableTiers.some((tier) => tier.id === minimumTierId)) {
        setMinimumTierId(availableTiers[0]?.id ?? null);
      }
    }

    if (gateType === 'specific_tier') {
      const validIds = allowedTierIds.filter((id) => availableTiers.some((tier) => tier.id === id));
      if (validIds.length === 0 && availableTiers.length > 0) {
        setAllowedTierIds([availableTiers[0].id]);
      } else if (validIds.length !== allowedTierIds.length) {
        setAllowedTierIds(validIds);
      }
    } else if (allowedTierIds.length > 0) {
      setAllowedTierIds([]);
    }
  }, [availableTiers, gateEnabled, gateType, allowedTierIds, minimumTierId]);

  const loadRulesFor = useCallback(
    async (contentId: string) => {
      if (!contentId) {
        resetState();
        return;
      }

      try {
        const rule = await fetchMembershipAccessRules(contentType, contentId);
        if (!rule) {
          resetState();
          return;
        }

        setGateEnabled(true);
        setGateType((rule.gate_type as ContentGateType) ?? 'tier_or_higher');
        setMinimumTierId(rule.minimum_tier_id ?? null);
        setAllowedTierIds(ensureArray(rule.allowed_tier_ids));
        setPreviewText(rule.preview_text ?? '');
        setPreviewDuration(rule.preview_duration ? String(rule.preview_duration) : '');
      } catch (error) {
        console.error('[useMembershipAccessRuleEditor] Failed to load rules', error);
        resetState();
      }
    },
    [contentType, resetState]
  );

  const saveRulesFor = useCallback(
    async (contentId: string) => {
      const { ownerId, ownerType } = owner;

      if (!contentId || !ownerId || !ownerType) {
        return;
      }

      if (!gateEnabled || availableTiers.length === 0) {
        await deleteMembershipAccessRules(contentType, contentId);
        return;
      }

      let resolvedMinimumId = minimumTierId;
      if (gateType === 'tier_or_higher') {
        if (!resolvedMinimumId || !availableTiers.some((tier) => tier.id === resolvedMinimumId)) {
          resolvedMinimumId = availableTiers[0]?.id ?? null;
        }
        if (!resolvedMinimumId) {
          return;
        }
      }

      const filteredAllowed = gateType === 'specific_tier'
        ? allowedTierIds.filter((id) => availableTiers.some((tier) => tier.id === id))
        : null;

      const previewDurationNumber = previewDuration.trim()
        ? Math.max(0, parseInt(previewDuration.trim(), 10) || 0)
        : null;

      await upsertMembershipAccessRules({
        contentId,
        contentType,
        ownerId,
        ownerType,
        gateType,
        minimumTierId: gateType === 'tier_or_higher' ? resolvedMinimumId : null,
        allowedTierIds: gateType === 'specific_tier' ? filteredAllowed : null,
        previewText: previewText.trim() || null,
        previewDuration: previewDurationNumber,
      });
    },
    [
      owner,
      gateEnabled,
      availableTiers,
      minimumTierId,
      gateType,
      allowedTierIds,
      previewText,
      previewDuration,
      contentType,
    ]
  );

  const deleteRulesFor = useCallback(
    async (contentId: string) => {
      await deleteMembershipAccessRules(contentType, contentId);
    },
    [contentType]
  );

  return {
    availableTiers,
    tiersLoading,
    gateEnabled,
    setGateEnabled,
    gateType,
    setGateType,
    minimumTierId,
    setMinimumTierId,
    allowedTierIds,
    setAllowedTierIds,
    previewText,
    setPreviewText,
    previewDuration,
    setPreviewDuration,
    loadRulesFor,
    saveRulesFor,
    deleteRulesFor,
  };
};

export default useMembershipAccessRuleEditor;

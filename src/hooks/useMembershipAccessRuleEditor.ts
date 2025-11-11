import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { ContentGateType, ContentType, OwnerType } from '@/types/memberships';
import { useLogger } from '@/hooks/useLogger';
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

export interface AccessRulePreviewSummary {
  gateType: ContentGateType;
  minimumTier: SimpleMembershipTier | null;
  specificTiers: SimpleMembershipTier[];
  availableTierCount: number;
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
  validationIssues: string[];
  canPersistRules: boolean;
  selectedMinimumTier: SimpleMembershipTier | null;
  selectedSpecificTiers: SimpleMembershipTier[];
  previewSummary: AccessRulePreviewSummary;
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
  const { logEvent, logWarn, logError } = useLogger({
    component: 'useMembershipAccessRuleEditor',
    feature: 'membership_gating',
    metadata: { contentType },
  });

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
        void logError('membership_tier_load_failed', error, { ownerType, ownerId });
        setAvailableTiers([]);
      } else {
        setAvailableTiers((data as SimpleMembershipTier[]) ?? []);
        void logEvent('membership_tiers_loaded', {
          ownerType,
          ownerId,
          tierCount: data?.length ?? 0,
        });
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
          void logEvent('membership_access_rule_absent', { contentId });
          return;
        }

        setGateEnabled(true);
        setGateType((rule.gate_type as ContentGateType) ?? 'tier_or_higher');
        setMinimumTierId(rule.minimum_tier_id ?? null);
        setAllowedTierIds(ensureArray(rule.allowed_tier_ids));
        setPreviewText(rule.preview_text ?? '');
        setPreviewDuration(rule.preview_duration ? String(rule.preview_duration) : '');
        void logEvent('membership_access_rule_loaded', {
          contentId,
          gateType: rule.gate_type,
          minimumTierId: rule.minimum_tier_id,
          allowedTierCount: rule.allowed_tier_ids?.length ?? 0,
        });
      } catch (error) {
        console.error('[useMembershipAccessRuleEditor] Failed to load rules', error);
        void logError('membership_access_rule_load_failed', error, { contentId });
        resetState();
      }
    },
    [contentType, resetState]
  );

  const selectedMinimumTier = useMemo(
    () => availableTiers.find((tier) => tier.id === minimumTierId) ?? null,
    [availableTiers, minimumTierId]
  );

  const selectedSpecificTiers = useMemo(
    () => availableTiers.filter((tier) => allowedTierIds.includes(tier.id)),
    [availableTiers, allowedTierIds]
  );

  const validationIssues = useMemo(() => {
    if (!gateEnabled) return [];

    const issues: string[] = [];

    if (availableTiers.length === 0) {
      issues.push('Create at least one active membership tier before enabling gating.');
    }

    if (gateType === 'tier_or_higher' && !selectedMinimumTier) {
      issues.push('Select a minimum tier for the “tier or higher” option.');
    }

    if (gateType === 'specific_tier' && selectedSpecificTiers.length === 0) {
      issues.push('Choose at least one tier to unlock the content.');
    }

    const previewDurationRaw = previewDuration.trim();
    if (previewDurationRaw) {
      const numericValue = Number(previewDurationRaw);
      if (Number.isNaN(numericValue) || numericValue < 0) {
        issues.push('Preview duration must be a non-negative number of seconds.');
      }
    }

    return issues;
  }, [gateEnabled, gateType, selectedMinimumTier, selectedSpecificTiers, availableTiers.length, previewDuration]);

  const previewSummary: AccessRulePreviewSummary = useMemo(
    () => ({
      gateType,
      minimumTier: selectedMinimumTier,
      specificTiers: selectedSpecificTiers,
      availableTierCount: availableTiers.length,
    }),
    [gateType, selectedMinimumTier, selectedSpecificTiers, availableTiers.length]
  );

  const canPersistRules = !gateEnabled || validationIssues.length === 0;

  const saveRulesFor = useCallback(
    async (contentId: string) => {
      const { ownerId, ownerType } = owner;

      if (!contentId || !ownerId || !ownerType) {
        return;
      }

      if (!gateEnabled || availableTiers.length === 0) {
        await deleteMembershipAccessRules(contentType, contentId);
        void logEvent('membership_access_rule_disabled', { contentId });
        return;
      }

      if (validationIssues.length > 0) {
        void logWarn('membership_access_rule_validation_failed', { contentId, validationIssues });
        throw new Error(validationIssues.join(' '));
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
        ? selectedSpecificTiers.map((tier) => tier.id)
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

      void logEvent('membership_access_rule_saved', {
        contentId,
        gateType,
        minimumTierId: gateType === 'tier_or_higher' ? resolvedMinimumId : null,
        allowedTierCount: filteredAllowed?.length ?? 0,
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
      validationIssues,
      selectedSpecificTiers,
      logEvent,
      logWarn,
    ]
  );

  const deleteRulesFor = useCallback(
    async (contentId: string) => {
      if (!contentId) return;
      await deleteMembershipAccessRules(contentType, contentId);
      void logEvent('membership_access_rule_deleted', { contentId });
    },
    [contentType, logEvent]
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
    validationIssues,
    canPersistRules,
    selectedMinimumTier,
    selectedSpecificTiers,
    previewSummary,
    loadRulesFor,
    saveRulesFor,
    deleteRulesFor,
  };
};

export default useMembershipAccessRuleEditor;

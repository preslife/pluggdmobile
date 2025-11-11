import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AccessRulePreviewSummary, SimpleMembershipTier } from '@/hooks/useMembershipAccessRuleEditor';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, Crown, Clock } from 'lucide-react';

interface MembershipGateSummaryProps {
  gateEnabled: boolean;
  validationIssues: string[];
  previewSummary: AccessRulePreviewSummary;
  previewText: string;
  previewDuration: string;
}

const renderTierPrice = (tier: SimpleMembershipTier | null) => {
  if (!tier) return null;
  const rawPrice = tier.price_monthly ?? tier.price_yearly ?? tier.price_lifetime;
  if (rawPrice == null) return null;
  const normalised = rawPrice > 1000 ? rawPrice / 100 : rawPrice;
  return formatCurrency(normalised, tier.currency ?? 'USD');
};

const renderSummaryCopy = (summary: AccessRulePreviewSummary) => {
  switch (summary.gateType) {
    case 'tier_or_higher':
      return summary.minimumTier
        ? `Members on ${summary.minimumTier.name} or higher unlock everything.`
        : 'Select a minimum tier to finish configuring gating.';
    case 'specific_tier':
      if (summary.specificTiers.length === 0) {
        return 'Choose at least one tier to permit access.';
      }
      return `Unlocked for ${summary.specificTiers.map((tier) => tier.name).join(', ')}.`;
    case 'any_tier':
      return `Any active membership (${summary.availableTierCount} tier${
        summary.availableTierCount === 1 ? '' : 's'
      }) unlocks this content.`;
    default:
      return '';
  }
};

export const MembershipGateSummary = ({
  gateEnabled,
  validationIssues,
  previewSummary,
  previewText,
  previewDuration,
}: MembershipGateSummaryProps) => {
  if (!gateEnabled) return null;

  const readablePreviewLength = previewDuration
    ? `${previewDuration.trim()}s preview`
    : 'Preview length not set';
  const minimumTierPrice = renderTierPrice(previewSummary.minimumTier);

  return (
    <div className="space-y-3 text-sm">
      {validationIssues.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fix your membership gating settings</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 space-y-1">
              {validationIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border bg-muted/40 p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Crown className="h-3 w-3" />
          Access summary
        </div>
        <p className="text-sm">{renderSummaryCopy(previewSummary)}</p>
        {previewSummary.gateType === 'tier_or_higher' && previewSummary.minimumTier && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">{previewSummary.minimumTier.name}</span>
            {minimumTierPrice ? ` • starts at ${minimumTierPrice}` : null}
          </div>
        )}
        {previewSummary.gateType === 'specific_tier' && previewSummary.specificTiers.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {previewSummary.specificTiers.map((tier) => tier.name).join(', ')}
          </div>
        )}
      </div>

      {(previewText.trim() || previewDuration.trim()) && (
        <div className="rounded-md border bg-muted/20 p-3 text-xs space-y-1">
          <div className="flex items-center gap-2 font-medium text-muted-foreground">
            <Clock className="h-3 w-3" />
            Preview experience
          </div>
          {previewText.trim() && <p className="text-sm">{previewText.trim()}</p>}
          <p className="text-muted-foreground">{readablePreviewLength}</p>
        </div>
      )}
    </div>
  );
};

export default MembershipGateSummary;

// Membership Types & Interfaces

export type BillingPeriod = 'monthly' | 'yearly' | 'lifetime';
export type TierStatus = 'draft' | 'active' | 'paused' | 'archived';
export type MembershipStatus = 'active' | 'cancelled' | 'expired' | 'past_due';
export type ContentGateType = 'tier_or_higher' | 'specific_tier' | 'any_tier';
export type OwnerType = 'profile' | 'label';
export type ContentType = 'post' | 'track' | 'release' | 'video' | 'livestream';

export type PerkType =
  | 'discord_role'
  | 'early_access'
  | 'exclusive_content'
  | 'download_access'
  | 'merch_discount'
  | 'livestream_access'
  | 'custom_badge'
  | 'shoutout'
  | 'behind_the_scenes';

export interface MembershipTier {
  id: string;
  owner_type: OwnerType;
  owner_id: string;
  name: string;
  slug: string;
  description?: string;
  tier_order: number;

  // Pricing (in cents)
  price_monthly?: number;
  price_yearly?: number;
  price_lifetime?: number;
  currency: string;

  status: TierStatus;
  max_members?: number;
  current_members: number;

  // Visual
  color?: string;
  emoji?: string;
  image_url?: string;

  features: string[];

  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  tier_id: string;
  user_id: string;
  billing_period: BillingPeriod;
  status: MembershipStatus;

  stripe_subscription_id?: string;
  stripe_customer_id?: string;

  started_at: string;
  current_period_start: string;
  current_period_end?: string;
  cancelled_at?: string;
  expires_at?: string;

  support_amount: number; // Total paid in cents
  metadata?: Record<string, any>;

  created_at: string;
  updated_at: string;

  // Joined data
  tier?: MembershipTier;
}

export interface MembershipPerk {
  id: string;
  tier_id: string;
  type: PerkType;
  name: string;
  description?: string;
  config?: Record<string, any>;
  enabled: boolean;
  created_at: string;
}

export interface GatedContent {
  id: string;
  content_type: ContentType;
  content_id: string;
  owner_type: OwnerType;
  owner_id: string;

  gate_type: ContentGateType;
  minimum_tier_id?: string;
  allowed_tier_ids?: string[];

  preview_text?: string;
  preview_duration?: number; // Seconds for audio/video

  created_at: string;
}

export interface MembershipMetrics {
  id: string;
  owner_type: OwnerType;
  owner_id: string;
  date: string;

  total_members: number;
  new_members: number;
  churned_members: number;

  gross_revenue: number; // In cents
  net_revenue: number; // In cents

  tier_breakdown: Record<string, {
    members: number;
    revenue: number;
  }>;

  created_at: string;
}

// Helper functions
export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });
}

export function getPerkIcon(type: PerkType): string {
  const icons: Record<PerkType, string> = {
    discord_role: '💬',
    early_access: '⚡',
    exclusive_content: '🔒',
    download_access: '⬇️',
    merch_discount: '🎁',
    livestream_access: '📹',
    custom_badge: '🏆',
    shoutout: '📣',
    behind_the_scenes: '🎬'
  };
  return icons[type] || '✨';
}

export function getPerkLabel(type: PerkType): string {
  const labels: Record<PerkType, string> = {
    discord_role: 'Discord Role',
    early_access: 'Early Access',
    exclusive_content: 'Exclusive Content',
    download_access: 'Download Access',
    merch_discount: 'Merch Discount',
    livestream_access: 'Livestream Access',
    custom_badge: 'Custom Badge',
    shoutout: 'Shoutout',
    behind_the_scenes: 'Behind the Scenes'
  };
  return labels[type] || type;
}

export function getTierBadgeColor(tierOrder: number): string {
  const colors = [
    '#9CA3AF', // Gray - Base tier
    '#10B981', // Green
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#EF4444', // Red - Highest tier
  ];
  return colors[Math.min(tierOrder, colors.length - 1)];
}
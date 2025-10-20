## Labels/Teams Implementation Plan (Concise, Pick-up-Ready)

This plan aligns to the 8 flows you specified and assumes a dedicated `labels` entity separate from personal `profiles`. It is optimized to resume mid-way if usage runs out.

### Phase 0 — Backups, Branching, Journal
- Snapshot path: BACKUPS/<timestamp>_LABELS_PLAN_SNAPSHOT (created)
- Branch: feature/labels-architecture-plan (created)
- Tasks: keep BUILD_JOURNAL updated per change

### Phase 1 — Schema & RLS (Supabase)
- Tables:
  - labels (id, slug UNIQUE, name, logo_url, cover_image_url, genre, contact_email, country, owner_user_id FK profiles.user_id, created_by_admin bool, claimed_at timestamptz, created_at, updated_at)
  - label_members (label_id FK labels.id, user_id FK profiles.user_id, role enum[owner,admin,editor,viewer], invited_by, created_at)
  - label_invitations (id, label_id, email, role, token, expires_at, invited_by, accepted_by_user_id, accepted_at, created_at)
  - managed_profiles (id, label_id, creator_profile_id FK profiles.id, status enum[pending,active,removed], invited_by, accepted_at, created_at)
  - ownership_transfer_requests (id, label_id, from_user_id, to_user_id, token, expires_at, accepted_at, created_at)
  - deletion_requests (id, label_id, requested_by, type enum[downgrade,delete], payload_json, confirmed_at, created_at)
- RLS (summary):
  - labels: public read (public fields); owner/admin update; insert via RPCs only
  - label_members: owner/admin manage; users read their own rows
  - managed_profiles: owner/admin/editor manage; creator must accept link
  - invitations/transfer/deletion: restricted to involved parties + service role
- Owner-aware content: ensure tables that reference owner use fields: owner_type enum['profile','label'], owner_id uuid

### Phase 2 — Edge Functions / RPCs
- create_label_for_current_user(name, slug, …) → label + owner membership
- admin_create_managed_label(name, owner_email?, …) → label + claim invite
- invite_label_member(label_id, email, role) → invitation email
- accept_label_invite(token) → membership
- link_artist_to_label(label_id, creator_profile_id) → request to creator
- accept_label_link_request(token) → activate link
- switch_content_owner(content_table, content_id, to_owner_type, to_owner_id)
- request_ownership_transfer(label_id, to_user_id/email) → token
- accept_ownership_transfer(token)
- request_label_downgrade(label_id, payload)
- confirm_label_delete(token)
- claim_admin_created_profile(token)

### Phase 3 — UI Scaffolding (Navigation & Context)
- Header + Studio sidebar: add "Label Studio"; show if user is label member or has pending claim
- Admin menu: "Admin Labels"
- Context switcher: Personal vs Label in Studio header; persist in local state
- Publish-as selector on create/edit forms; writes owner_type/owner_id

### Phase 4 — Signup & Upgrade Flows
- Signup: toggle Individual vs Label/Team; label form collects label + owner + optional invites
- Upgrade for creators: prefilled label form; create label; show context switch; optional "link my content to label"

### Phase 5 — Label Dashboard Modules
- Overview: setup checklist (logo, team, artists, payouts)
- Roster: invite by email, change roles, remove, resend/cancel invites
- Artists: search/link existing creators or invite; pending requests; unlink
- Financials: Stripe Connect onboarding; show status; block payouts until complete
- Settings: label profile, slug, branding; ownership transfer; downgrade/delete guardrails

### Phase 6 — Admin Portal Flows
- Create Managed Label/Creator; set minimal details; send claim link
- Pre-claim management: admin can upload content; clearly marked as managed
- Claim flow: token-based onboarding; admin demoted to support on success

### Phase 7 — Emails & Tokens
- Email templates: member invite, claim profile, ownership transfer, deletion confirmations
- Token generation/expiry; single-use; audit trails

### Phase 8 — Public Pages & SEO
- /label/:slug → fetch from labels; render branding, roster links, releases under label
- SEO schema: MusicGroup for labels; Person for creators

### Phase 9 — Migration
- If any profiles.is_label = true: create labels row, owner membership, migrate slug/assets; keep personal profile intact
- Map content where owner_type/owner_id was implicit → explicit

### Acceptance Checklist
- New signup as Label works, with team invites
- Existing creator upgrade works; context switching present; publish-as works
- Admin can create managed labels; partners can claim
- Label roster invites/acceptance; artists link/unlink with consent
- Ownership transfer flow guarded and auditable
- Downgrade/delete flows with content/subscriber handling
- Public label pages by slug; owner_type enforced across content

### Rollout & Safety
- Feature flag: LABELS_ENABLED per environment
- Progressive enable: start with admin create + claim; then upgrade; then signup toggle
- Backups and journals before each phase; small, reversible edits
- Admin-only cleanup: prefer the `public.admin_delete_label(p_label_id uuid)` helper (see supabase/migrations/20250918094500_add_admin_delete_label_function.sql:1) instead of manual cascades when removing test labels.

# DETAILED IMPLEMENTATION PLAN
**Date**: January 13, 2025
**Focus**: Creator Studio Catalog Completion + Core Integrations
**Approach**: Exact code changes with file-by-file specifications

---

## 🎯 IMPLEMENTATION PRIORITIES

### **PHASE 1: Creator Studio Catalog Integration** (Priority 1)
### **PHASE 2: Credits ↔ XP Integration** (Priority 2)
### **PHASE 3: Navigation & UX Improvements** (Priority 3)

---

## 📋 PHASE 1: CREATOR STUDIO CATALOG INTEGRATION

### **1.1 Fix Quick Actions Navigation**
**Issue**: New forms (Merchandise, Bundle, Collectible) not accessible from Creator Studio Dashboard Quick Actions

#### **File**: `src/components/CreatorStudio/CreatorStudioDashboard.tsx`
**Lines**: 297-335 (quickActions array)
**Exact Changes**:

```typescript
// CURRENT quickActions array (lines 297-335):
const quickActions: QuickAction[] = [
  {
    title: "Upload Beat",
    description: "Add a new beat to your catalog",
    icon: Music,
    action: () => navigate("/producer"),
  },
  {
    title: "Upload Sample Pack",
    description: "Create a new sample pack",
    icon: Package,
    action: () => navigate("/sample-pack/upload"),
  },
  {
    title: "Create Release",
    description: "Build and distribute a release",
    icon: Upload,
    action: () => navigate("/release/new"),
  },
  {
    title: "Schedule Live Session",
    description: "Plan your next live performance",
    icon: Radio,
    action: () => navigate("/studio/live/sessions"),
  },
  {
    title: "Create Course",
    description: "Build an educational course",
    icon: CheckSquare,
    action: () => navigate("/studio/courses/builder"),
  },
  {
    title: "New Campaign",
    description: "Start a crowdfunding campaign",
    icon: DollarSign,
    action: () => navigate("/studio/crowdfunding/campaigns"),
    variant: "secondary" as const,
  },
];

// REPLACE WITH (add 3 new actions):
const quickActions: QuickAction[] = [
  {
    title: "Upload Beat",
    description: "Add a new beat to your catalog",
    icon: Music,
    action: () => navigate("/producer"),
  },
  {
    title: "Upload Sample Pack",
    description: "Create a new sample pack",
    icon: Package,
    action: () => navigate("/sample-pack/upload"),
  },
  {
    title: "Create Release",
    description: "Build and distribute a release",
    icon: Upload,
    action: () => navigate("/release/new"),
  },
  {
    title: "Create Merchandise", // NEW
    description: "Add physical merchandise to your store",
    icon: Gift,
    action: () => navigate("/studio/catalog/merchandise/new"),
  },
  {
    title: "Create Bundle", // NEW
    description: "Bundle multiple items together",
    icon: ShoppingBag,
    action: () => navigate("/studio/catalog/bundles/new"),
  },
  {
    title: "Create Collectible", // NEW
    description: "Create digital collectibles and NFTs",
    icon: Sparkles,
    action: () => navigate("/studio/catalog/collectibles/new"),
  },
  {
    title: "Schedule Live Session",
    description: "Plan your next live performance",
    icon: Radio,
    action: () => navigate("/studio/live/sessions"),
  },
  {
    title: "Create Course",
    description: "Build an educational course",
    icon: CheckSquare,
    action: () => navigate("/studio/courses/builder"),
  },
  {
    title: "New Campaign",
    description: "Start a crowdfunding campaign",
    icon: DollarSign,
    action: () => navigate("/studio/crowdfunding/campaigns"),
    variant: "secondary" as const,
  },
];
```

**Additional Import Required** (add to line 18):
```typescript
import { Gift, ShoppingBag, Sparkles } from "lucide-react";
```

### **1.2 Add Catalog Routes**
**Issue**: Routes for new forms don't exist in Creator Studio routing

#### **File**: `src/components/CreatorStudio/CreatorStudio.tsx`
**Lines**: 24-69 (Routes section)
**Exact Changes**:

```typescript
// ADD these new routes after line 62 (before Settings Routes):

{/* Catalog Form Routes */}
<Route path="/catalog/merchandise/new" element={<MerchandiseForm />} />
<Route path="/catalog/merchandise/edit/:id" element={<MerchandiseForm />} />
<Route path="/catalog/bundles/new" element={<BundleForm />} />
<Route path="/catalog/bundles/edit/:id" element={<BundleForm />} />
<Route path="/catalog/collectibles/new" element={<CollectibleForm />} />
<Route path="/catalog/collectibles/edit/:id" element={<CollectibleForm />} />
```

**Additional Imports Required** (add to lines 5-19):
```typescript
import { MerchandiseForm } from "./forms/MerchandiseForm";
import { BundleForm } from "./forms/BundleForm";
import { CollectibleForm } from "./forms/CollectibleForm";
```

### **1.3 Update Catalog Module Integration**
**Issue**: New content types not fully integrated into main catalog view

#### **File**: `src/components/CreatorStudio/modules/CatalogModule.tsx`
**Lines**: 163-200 (fetchCatalogItems function)
**Exact Changes**:

```typescript
// CURRENT fetchCatalogItems function queries (around line 170):
const [releases, beats, packs] = await Promise.all([
  supabase.from('releases').select('*').eq('user_id', user.id),
  supabase.from('beats').select('*').eq('user_id', user.id),
  supabase.from('sample_packs').select('*').eq('user_id', user.id),
]);

// REPLACE WITH (add 3 new content type queries):
const [{ data: catalogMetrics }, releases, beats, packs, merch, bundles, collectibles] = await Promise.all([
  supabase
    .from('label_catalog_items')
    .select('item_id, sales_count, net_revenue_cents')
    .eq('label_id', activeLabel.id),
  supabase.from('releases').select('*').eq('user_id', user.id),
  supabase.from('beats').select('*').eq('user_id', user.id),
  supabase.from('sample_packs').select('*').eq('user_id', user.id),
  supabase.from('creator_merchandise').select('*').eq('user_id', user.id), // NEW
  supabase.from('creator_bundles').select('*').eq('user_id', user.id), // NEW
  supabase.from('creator_collectibles').select('*').eq('user_id', user.id), // NEW
]);

// UPDATE the catalogItems mapping (around line 190):
const metricsById = new Map<string, { sales_count: number; net_revenue_cents: number }>();

(catalogMetrics?.data || []).forEach(metric => {
  metricsById.set(metric.item_id, {
    sales_count: metric.sales_count ?? 0,
    net_revenue_cents: metric.net_revenue_cents ?? 0,
  });
});

const allItems: CatalogItem[] = [
  ...(releases?.data || []).map(item => ({
    ...item,
    type: 'release' as const,
    cover_art_url: item.cover_art_url,
    price: item.price || 0,
    sales: metricsById.get(item.id)?.sales_count ?? 0,
    revenue: (metricsById.get(item.id)?.net_revenue_cents ?? 0) / 100,
  })),
  ...(beats?.data || []).map(item => ({
    ...item,
    type: 'beat' as const,
    image_url: item.image_url,
    price: item.price || 0,
    sales: metricsById.get(item.id)?.sales_count ?? 0,
    revenue: (metricsById.get(item.id)?.net_revenue_cents ?? 0) / 100,
  })),
  ...(packs?.data || []).map(item => ({
    ...item,
    type: 'pack' as const,
    image_url: item.cover_image_url,
    price: item.price || 0,
    sales: metricsById.get(item.id)?.sales_count ?? 0,
    revenue: (metricsById.get(item.id)?.net_revenue_cents ?? 0) / 100,
  })),
  // ADD NEW MAPPINGS:
  ...(merch?.data || []).map(item => ({
    ...item,
    type: 'merch' as const,
    image_url: item.image_url,
    price: item.price || 0,
    sales: item.sales_count || 0,
    revenue: item.revenue_total || 0,
  })),
  ...(bundles?.data || []).map(item => ({
    ...item,
    type: 'bundle' as const,
    image_url: item.image_url,
    price: item.bundle_price || 0,
    sales: item.sales_count || 0,
    revenue: item.revenue_total || 0,
  })),
  ...(collectibles?.data || []).map(item => ({
    ...item,
    type: 'collectible' as const,
    image_url: item.image_url,
    price: item.price || 0,
    sales: item.sales_count || 0,
    revenue: item.revenue_total || 0,
  })),
];
```

### **1.4 Add Create Buttons for New Content Types**
**Issue**: No "Create New" buttons for merchandise, bundles, collectibles

#### **File**: `src/components/CreatorStudio/modules/CatalogModule.tsx`
**Lines**: 450-480 (Create buttons section)
**Exact Changes**:

```typescript
// FIND the create buttons section and ADD these new buttons:

{/* ADD after existing create buttons */}
{(activeTab === 'merch' || activeTab === 'all') && (
  <Button
    onClick={() => navigate('/studio/catalog/merchandise/new')}
    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
  >
    <Plus className="w-4 h-4 mr-2" />
    Create Merchandise
  </Button>
)}

{(activeTab === 'bundles' || activeTab === 'all') && (
  <Button
    onClick={() => navigate('/studio/catalog/bundles/new')}
    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
  >
    <Plus className="w-4 h-4 mr-2" />
    Create Bundle
  </Button>
)}

{(activeTab === 'collectibles' || activeTab === 'all') && (
  <Button
    onClick={() => navigate('/studio/catalog/collectibles/new')}
    className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
  >
    <Plus className="w-4 h-4 mr-2" />
    Create Collectible
  </Button>
)}
```

### **1.5 Update Tab System**
**Issue**: New content type tabs not in the tab navigation

#### **File**: `src/components/CreatorStudio/modules/CatalogModule.tsx`
**Lines**: 350-380 (TabsList section)
**Exact Changes**:

```typescript
// CURRENT TabsList (around line 360):
<TabsList className="grid grid-cols-4 bg-muted/30">
  <TabsTrigger value="releases">Releases</TabsTrigger>
  <TabsTrigger value="beats">Beats</TabsTrigger>
  <TabsTrigger value="packs">Sample Packs</TabsTrigger>
  <TabsTrigger value="all">All Items</TabsTrigger>
</TabsList>

// REPLACE WITH (extend to accommodate new types):
<TabsList className="grid grid-cols-7 bg-muted/30">
  <TabsTrigger value="releases">Releases</TabsTrigger>
  <TabsTrigger value="beats">Beats</TabsTrigger>
  <TabsTrigger value="packs">Packs</TabsTrigger>
  <TabsTrigger value="merch">Merch</TabsTrigger> {/* NEW */}
  <TabsTrigger value="bundles">Bundles</TabsTrigger> {/* NEW */}
  <TabsTrigger value="collectibles">Collectibles</TabsTrigger> {/* NEW */}
  <TabsTrigger value="all">All Items</TabsTrigger>
</TabsList>

// ADD new TabsContent sections after existing ones:
<TabsContent value="merch">
  {filteredItems.filter(item => item.type === 'merch').length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredItems
        .filter(item => item.type === 'merch')
        .map(item => renderCatalogItem(item))}
    </div>
  ) : (
    <div className="text-center py-12">
      <Gift className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-medium mb-2">No merchandise yet</h3>
      <p className="text-muted-foreground mb-4">Create your first merchandise item</p>
      <Button onClick={() => navigate('/studio/catalog/merchandise/new')}>
        <Plus className="w-4 h-4 mr-2" />
        Create Merchandise
      </Button>
    </div>
  )}
</TabsContent>

<TabsContent value="bundles">
  {filteredItems.filter(item => item.type === 'bundle').length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredItems
        .filter(item => item.type === 'bundle')
        .map(item => renderCatalogItem(item))}
    </div>
  ) : (
    <div className="text-center py-12">
      <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-medium mb-2">No bundles yet</h3>
      <p className="text-muted-foreground mb-4">Bundle multiple items together</p>
      <Button onClick={() => navigate('/studio/catalog/bundles/new')}>
        <Plus className="w-4 h-4 mr-2" />
        Create Bundle
      </Button>
    </div>
  )}
</TabsContent>

<TabsContent value="collectibles">
  {filteredItems.filter(item => item.type === 'collectible').length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredItems
        .filter(item => item.type === 'collectible')
        .map(item => renderCatalogItem(item))}
    </div>
  ) : (
    <div className="text-center py-12">
      <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-medium mb-2">No collectibles yet</h3>
      <p className="text-muted-foreground mb-4">Create digital collectibles and NFTs</p>
      <Button onClick={() => navigate('/studio/catalog/collectibles/new')}>
        <Plus className="w-4 h-4 mr-2" />
        Create Collectible
      </Button>
    </div>
  )}
</TabsContent>
```

---

## 📋 PHASE 2: CREDITS ↔ XP INTEGRATION

### **2.1 Add XP Rewards for Credit Purchases**
**Issue**: No XP rewards when users spend credits

#### **File**: `src/hooks/useWallet.tsx`
**Lines**: 140-180 (spendCredits function)
**Exact Changes**:

```typescript
// IMPORT useGamification at top of file:
import { useGamification } from './useGamification';

// ADD to WalletProvider component (around line 40):
const { awardXP } = useGamification();

// MODIFY spendCredits function (around line 150):
const spendCredits = async (
  amount: number,
  kind: WalletLedgerEntry['kind'],
  ref_type?: string,
  ref_id?: string,
  counterparty_id?: string
): Promise<{ success: boolean; error?: string }> => {
  if (!user) return { success: false, error: 'Not authenticated' };

  try {
    const { data, error } = await supabase.rpc('spend_credits', {
      p_user_id: user.id,
      p_amount: amount,
      p_kind: kind,
      p_ref_type: ref_type,
      p_ref_id: ref_id,
      p_counterparty_user_id: counterparty_id
    });

    if (error) throw error;

    if (data.success) {
      await refreshBalance();

      // ADD XP REWARD LOGIC:
      // Award XP for spending credits (10 XP per 1000 credits spent)
      const xpReward = Math.floor(amount / 100); // 10 XP per 1000 credits
      if (xpReward > 0) {
        await awardXP(xpReward, `spent_credits_${kind}`, `Earned ${xpReward} XP for spending ${amount} credits`);
      }

      return { success: true };
    }

    return { success: false, error: data.error || 'Failed to spend credits' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
```

### **2.2 Add Credit Milestone Rewards**
**Issue**: No credit rewards for reaching XP milestones

#### **File**: `src/hooks/useGamification.tsx`
**Lines**: 240-280 (level calculation logic)
**Exact Changes**:

```typescript
// ADD import for wallet at top:
import { useWallet } from './useWallet';

// ADD to useGamification hook (around line 74):
const { topUpCredits } = useWallet();

// MODIFY updateUserStats function to check for level-ups and credit rewards:
const updateUserStats = async (newStats: Partial<UserStats>) => {
  if (!user || !userStats) return;

  try {
    const oldLevel = userStats.level;

    const { data, error } = await supabase
      .from('user_stats')
      .update(newStats)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    const updatedStats = data as UserStats;
    setUserStats(updatedStats);

    // CHECK FOR LEVEL UP AND AWARD CREDITS:
    const newLevel = updatedStats.level;
    if (newLevel > oldLevel) {
      // Award credits for level milestones
      const creditRewards = {
        5: 100,   // Level 5 = 100 credits
        10: 250,  // Level 10 = 250 credits
        15: 500,  // Level 15 = 500 credits
        25: 1000, // Level 25 = 1000 credits
        50: 2500, // Level 50 = 2500 credits
      };

      const reward = creditRewards[newLevel as keyof typeof creditRewards];
      if (reward) {
        // Award credits through wallet system
        await supabase.rpc('award_milestone_credits', {
          p_user_id: user.id,
          p_amount: reward,
          p_level: newLevel
        });

        toast({
          title: "Level Up Reward!",
          description: `Congratulations on reaching level ${newLevel}! You've earned ${reward} credits.`,
          duration: 5000,
        });

        // Also award achievement for milestone
        await awardAchievement(
          'level_milestone',
          `Level ${newLevel} Milestone`,
          `Reached level ${newLevel}`,
          reward / 4 // Bonus XP equal to 1/4 of credit reward
        );
      }
    }

    return updatedStats;
  } catch (error: any) {
    console.error('Error updating user stats:', error);
    toast({
      title: "Error updating stats",
      description: error.message,
      variant: "destructive"
    });
  }
};
```

### **2.3 Add Database Function for Credit Rewards**
**Issue**: Need database function to award milestone credits

#### **NEW FILE**: `supabase/functions/award_milestone_credits.sql`
**Create New Database Function**:

```sql
-- Create function to award milestone credits
CREATE OR REPLACE FUNCTION award_milestone_credits(
  p_user_id uuid,
  p_amount integer,
  p_level integer
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Insert credit award into wallet ledger
  INSERT INTO wallet_ledger (
    user_id,
    kind,
    amount_credits,
    ref_type,
    ref_id,
    meta
  ) VALUES (
    p_user_id,
    'award_milestone',
    p_amount,
    'level_reward',
    p_level::text,
    json_build_object('level', p_level, 'reward_type', 'milestone')
  );

  -- Update user's credit balance
  INSERT INTO user_credit_balances (user_id, balance_credits)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance_credits = user_credit_balances.balance_credits + p_amount,
    updated_at = now();

  result := json_build_object(
    'success', true,
    'credits_awarded', p_amount,
    'level', p_level
  );

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
```

### **2.4 Add Badge-Based Purchase Discounts**
**Issue**: No benefits for earning badges

#### **File**: `src/components/checkout/CheckoutModal.tsx`
**Lines**: 80-120 (price calculation section)
**Exact Changes**:

```typescript
// ADD import for badges:
import { useBadges } from '@/hooks/useBadges';

// ADD to CheckoutModal component:
const { getUserBadges } = useBadges();
const [userBadges, setUserBadges] = useState([]);
const [discount, setDiscount] = useState(0);

// ADD useEffect to fetch badges and calculate discount:
useEffect(() => {
  const fetchBadgesAndDiscount = async () => {
    if (user) {
      const badges = await getUserBadges(user.id);
      setUserBadges(badges);

      // Calculate discount based on badge tiers
      const platinumBadges = badges.filter(b => b.tier === 'platinum').length;
      const goldBadges = badges.filter(b => b.tier === 'gold').length;

      let discountPercent = 0;
      if (platinumBadges >= 3) discountPercent = 15; // 15% for 3+ platinum badges
      else if (platinumBadges >= 1) discountPercent = 10; // 10% for 1+ platinum badges
      else if (goldBadges >= 5) discountPercent = 5; // 5% for 5+ gold badges

      setDiscount(discountPercent);
    }
  };

  fetchBadgesAndDiscount();
}, [user]);

// MODIFY total cost calculation:
const originalTotal = items.reduce((sum, item) => sum + item.price, 0);
const discountAmount = Math.floor(originalTotal * (discount / 100));
const totalCost = originalTotal - discountAmount;

// ADD discount display in UI:
{discount > 0 && (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">Badge Discount ({discount}%):</span>
    <span className="text-green-600">-{discountAmount} credits</span>
  </div>
)}
```

---

## 📋 PHASE 3: NAVIGATION & UX IMPROVEMENTS

### **3.1 Add Success Redirects from Forms**
**Issue**: Forms don't redirect to catalog after successful creation

#### **File**: `src/components/CreatorStudio/forms/MerchandiseForm.tsx`
**Lines**: 175-180 (success handling)
**Exact Changes**:

```typescript
// MODIFY the success toast and navigation:
toast({
  title: "Success",
  description: "Merchandise created successfully",
});

// CHANGE from:
navigate('/studio/catalog');

// CHANGE to:
navigate('/studio/catalog?tab=merch&highlight=' + newItemId);
```

#### **File**: `src/components/CreatorStudio/forms/BundleForm.tsx`
**Lines**: 210-215 (success handling)
**Exact Changes**:

```typescript
// MODIFY success redirect:
navigate('/studio/catalog?tab=bundles&highlight=' + data.id);
```

#### **File**: `src/components/CreatorStudio/forms/CollectibleForm.tsx`
**Lines**: 220-225 (success handling)
**Exact Changes**:

```typescript
// MODIFY success redirect:
navigate('/studio/catalog?tab=collectibles&highlight=' + data.id);
```

### **3.2 Add Item Highlighting in Catalog**
**Issue**: No visual indication of newly created items

#### **File**: `src/components/CreatorStudio/modules/CatalogModule.tsx`
**Lines**: 90-100 (component state)
**Exact Changes**:

```typescript
// ADD highlight state:
const [highlightId, setHighlightId] = useState<string | null>(null);

// ADD useEffect to check for highlight parameter:
useEffect(() => {
  const highlight = searchParams.get('highlight');
  if (highlight) {
    setHighlightId(highlight);
    // Clear highlight after 3 seconds
    setTimeout(() => setHighlightId(null), 3000);
  }
}, [searchParams]);

// MODIFY renderCatalogItem to include highlight class:
const renderCatalogItem = (item: CatalogItem) => {
  const isHighlighted = item.id === highlightId;

  return (
    <Card key={item.id} className={`group hover:shadow-md transition-all ${
      isHighlighted ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''
    }`}>
      {/* rest of card content */}
    </Card>
  );
};
```

### **3.3 Add Bulk Operations**
**Issue**: No way to perform bulk actions on catalog items

#### **File**: `src/components/CreatorStudio/modules/CatalogModule.tsx`
**Lines**: 95-105 (state declarations)
**Exact Changes**:

```typescript
// ADD bulk operation states:
const [selectedItems, setSelectedItems] = useState<string[]>([]);
const [bulkActionMode, setBulkActionMode] = useState(false);

// ADD bulk action functions:
const toggleItemSelection = (itemId: string) => {
  setSelectedItems(prev =>
    prev.includes(itemId)
      ? prev.filter(id => id !== itemId)
      : [...prev, itemId]
  );
};

const handleBulkAction = async (action: 'publish' | 'unpublish' | 'delete') => {
  // Implementation for bulk actions
  try {
    switch (action) {
      case 'publish':
        await Promise.all(selectedItems.map(id =>
          supabase.from('catalog_items').update({ status: 'live' }).eq('id', id)
        ));
        break;
      case 'unpublish':
        await Promise.all(selectedItems.map(id =>
          supabase.from('catalog_items').update({ status: 'draft' }).eq('id', id)
        ));
        break;
      case 'delete':
        await Promise.all(selectedItems.map(id =>
          supabase.from('catalog_items').delete().eq('id', id)
        ));
        break;
    }

    toast({ title: `Bulk ${action} completed successfully` });
    setSelectedItems([]);
    setBulkActionMode(false);
    fetchCatalogItems();
  } catch (error) {
    toast({ title: "Bulk action failed", variant: "destructive" });
  }
};
```

---

## 📋 DATABASE CHANGES REQUIRED

### **4.1 Add Missing RPC Functions**

#### **File**: `supabase/functions/spend_credits.sql` (if not exists)
```sql
CREATE OR REPLACE FUNCTION spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_kind text,
  p_ref_type text DEFAULT NULL,
  p_ref_id text DEFAULT NULL,
  p_counterparty_user_id uuid DEFAULT NULL
) RETURNS json AS $$
-- Implementation for credit spending with balance checks
$$;
```

#### **File**: `supabase/functions/get_wallet_balance.sql` (if not exists)
```sql
CREATE OR REPLACE FUNCTION get_wallet_balance(p_user_id uuid)
RETURNS json AS $$
-- Implementation for wallet balance calculation
$$;
```

### **4.2 Add User Credit Balances Table** (if not exists)
```sql
CREATE TABLE IF NOT EXISTS user_credit_balances (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  balance_credits integer DEFAULT 0,
  pending_credits integer DEFAULT 0,
  available_credits integer GENERATED ALWAYS AS (balance_credits - pending_credits) STORED,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

---

## 🧪 TESTING PLAN

### **Test Cases to Verify**

1. **Creator Studio Navigation**:
   - ✅ Quick Actions show all 9 content creation options
   - ✅ All navigation links work correctly
   - ✅ Forms are accessible from multiple entry points

2. **Catalog Integration**:
   - ✅ All 6 content types display in catalog tabs
   - ✅ New items appear after creation
   - ✅ Highlighting works for newly created items
   - ✅ Bulk operations work correctly

3. **Credits ↔ XP Integration**:
   - ✅ XP awarded for credit purchases (10 XP per 1000 credits)
   - ✅ Credit rewards at level milestones (5, 10, 15, 25, 50)
   - ✅ Badge discounts apply correctly (5%, 10%, 15%)
   - ✅ Database functions work without errors

4. **User Experience**:
   - ✅ Success messages display correctly
   - ✅ Redirects work as expected
   - ✅ No broken navigation
   - ✅ Performance remains acceptable

---

## 📊 SUCCESS METRICS

### **Immediate Goals** (Phase 1):
- [ ] All Creator Studio forms accessible from dashboard
- [ ] All content types display in catalog
- [ ] Navigation flows work end-to-end
- [ ] No TypeScript errors

### **Integration Goals** (Phase 2):
- [ ] XP rewards for credit spending functional
- [ ] Level-up credit bonuses working
- [ ] Badge discounts applying correctly
- [ ] Database functions operational

### **Experience Goals** (Phase 3):
- [ ] Smooth user flows from creation to catalog
- [ ] Bulk operations functional
- [ ] Visual feedback systems working
- [ ] Performance maintained

---

This detailed implementation plan provides exact file locations, line numbers, and code changes needed to complete the Creator Studio catalog integration and core Credits ↔ XP features. Each change is specified precisely to enable clear implementation without guesswork.

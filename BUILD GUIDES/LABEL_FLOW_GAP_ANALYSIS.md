# Label/Team Flow Gap Analysis
 
## Flow Comparison: Required vs Current Implementation

### 1. New Label/Team Onboarding (for brand-new users)

#### Required:
- Entry point on sign-up screen with "Individual" vs "Label/Team" toggle
- Collects label details + owner details in one flow
- Optional team member invitations at signup
- Creates both user account AND label profile
- Sends invitation emails
- Directs to label dashboard

#### Current Implementation:
❌ **NOT IMPLEMENTED**
- No Label/Team option in `OnboardingFlow.tsx` (only User vs Creator)
- No signup flow for labels
- Labels can only be created AFTER user account exists

#### Gap:
- Need to add Label/Team option to signup flow
- Need combined user + label creation process
- Need team invitation system at signup

---

### 2. Converting an Existing Creator to a Label

#### Required:
- "Upgrade to Label/Team" option in creator dashboard
- Pre-filled onboarding form
- Creator retains original profile + gains label profile
- Can switch between personal and label dashboards
- Can link existing content to label

#### Current Implementation:
✅ **PARTIALLY IMPLEMENTED**
- `CreateLabelForm.tsx` exists for creators to create labels
- Form is shown in `LabelStudioLayout.tsx` when user isn't a label
- Creates label in separate `labels` table via RPC
- User can access Label Studio after creation

❌ **MISSING**:
- No prominent "Upgrade to Label/Team" button in creator dashboard
- No pre-filling of creator details
- No content linking mechanism
- No dashboard switching UI

#### Gap:
- Need prominent upgrade CTA in creator dashboard
- Need to pre-fill form with creator's existing details
- Need content ownership transfer functionality
- Need dashboard switcher component

---

### 3. Admin-Created Profiles for External Partners

#### Required:
- Admin creates "Managed Label" or "Managed Creator"
- Sends email invitation with minimal onboarding
- Partner completes payment/tax details
- Partner can claim full control
- Admin manages until claimed

#### Current Implementation:
✅ **PARTIALLY IMPLEMENTED**
- `AdminLabelsPage.tsx` has form to create labels
- Uses `admin_create_managed_label` RPC (but RPC not in migrations)
- Sets `created_by_admin` flag

❌ **MISSING**:
- No email invitation system
- No claim flow for partners
- No minimal onboarding form
- No payment/tax collection
- No managed creator option (only labels)

#### Gap:
- Need email invitation system
- Need claim page/flow
- Need minimal onboarding form
- Need Stripe/payment integration
- Need managed creator profiles

---

### 4. Managing Team Members After Creation

#### Required:
- Add/remove members from label dashboard
- Change member roles
- Email invitations to new members

#### Current Implementation:
✅ **PARTIALLY IMPLEMENTED**
- `LabelRosterModule.tsx` has basic add member by username
- Uses `label_members` table with roles

❌ **MISSING**:
- No email invitations
- No role management UI
- No member removal UI
- No invitation acceptance flow

#### Gap:
- Need complete team management UI
- Need invitation system
- Need role change functionality

---

### 5. Linking and Unlinking Artists to a Label

#### Required:
- Search/invite existing artists
- Artists must accept link request
- Unlink preserves artist's personal content

#### Current Implementation:
❌ **NOT IMPLEMENTED**
- No artist linking UI
- No request/accept flow
- No content ownership rules

#### Gap:
- Need artist search/invite UI
- Need request/acceptance system
- Need content ownership logic

---

### 6. Transferring Label Ownership

#### Required:
- Current owner initiates transfer
- New owner accepts via link
- Previous owner role downgraded

#### Current Implementation:
❌ **NOT IMPLEMENTED**
- No ownership transfer UI
- No transfer request system

#### Gap:
- Need complete ownership transfer flow

---

### 7. Downgrading or Deleting a Label

#### Required:
- Owner can dissolve label
- Handle content/subscribers
- Notify affected parties

#### Current Implementation:
❌ **NOT IMPLEMENTED**
- No downgrade/delete options
- No content handling logic

#### Gap:
- Need downgrade/delete UI and logic

---

### 8. Claiming an Admin-Created Profile

#### Required:
- "Claim this page" button/link
- Minimal onboarding form
- Gain full control after claim

#### Current Implementation:
❌ **NOT IMPLEMENTED**
- No claim functionality
- No claim UI/flow

#### Gap:
- Need complete claim system

---

## Database/Backend Status

### Tables Created:
✅ `labels` table exists
✅ `label_members` table exists
✅ `label_invitations` table exists
✅ `ownership_transfer_requests` table exists
✅ `deletion_requests` table exists

### RPCs/Functions:
❌ **NOT IN MIGRATIONS** - Functions were drafted but not added to migration files:
- `create_label_for_current_user`
- `admin_create_managed_label`
- `invite_label_member`
- `accept_label_invite`
- `request_ownership_transfer`
- `accept_ownership_transfer`
- `request_label_action`
- `claim_admin_created_profile`
- `request_artist_link`
- `accept_artist_link`
- `unlink_artist_from_label`
- `switch_content_owner`

---

## Priority Implementation Order

### Phase 1: Core Label Creation (HIGH PRIORITY)
1. Add Label/Team option to signup flow
2. Fix creator-to-label upgrade flow with prominent CTA
3. Add all RPCs to migration files
4. Test basic label creation

### Phase 2: Team Management (MEDIUM PRIORITY)
1. Complete team invite/accept flow
2. Add role management UI
3. Implement email notifications

### Phase 3: Artist Linking (MEDIUM PRIORITY)
1. Build artist search/invite UI
2. Implement request/accept system
3. Add content ownership rules

### Phase 4: Advanced Features (LOW PRIORITY)
1. Ownership transfer
2. Label downgrade/delete
3. Admin-created profiles with claim flow
4. Payment/tax integration

---

## Critical Missing Pieces

1. **No RPCs in migrations** - Database functions exist in spec files but aren't deployed
2. **No email system** - Multiple flows require email invitations
3. **No claim system** - Admin-created profiles can't be claimed
4. **No content ownership** - No way to assign content to labels vs personal
5. **Poor discoverability** - No clear CTAs for label features

---

## Recommended Next Steps

1. **IMMEDIATE**: Add RPCs to migration files and deploy
2. **TODAY**: Add prominent "Upgrade to Label" CTA in creator dashboard
3. **TODAY**: Fix signup flow to include Label/Team option
4. **THIS WEEK**: Implement team invitation system
5. **THIS WEEK**: Build artist linking UI
6. **LATER**: Advanced features (transfer, delete, claim)


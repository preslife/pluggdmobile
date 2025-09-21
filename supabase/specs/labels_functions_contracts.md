## Labels/Teams Edge Functions & RPC Contracts (Draft)

All functions are authenticated unless stated. Service-role required for admin flows and email dispatch. Token flows use single-use, expiring tokens.

### create_label_for_current_user
- Method: RPC or Edge Function (auth required)
- Input: { name: string, slug: string, genre?: string, contact_email?: string, country?: string, logo_url?: string, cover_image_url?: string }
- Steps: insert labels; insert label_members (owner); return { label }
- Errors: slug_conflict, duplicate_owner_label (optional business rule)

### admin_create_managed_label
- Method: Edge Function (service role)
- Input: { name: string, slug?: string, owner_email?: string, contact_email?: string, country?: string, logo_url?: string, cover_image_url?: string, notes?: string }
- Steps: create label (created_by_admin=true); generate claim token for owner_email; send email
- Output: { label_id, claim_token? }

### invite_label_member
- Method: Edge Function
- Input: { label_id: uuid, email: string, role: 'admin'|'editor'|'viewer' }
- AuthZ: caller must be owner/admin of label
- Steps: generate token; insert label_invitations; send email
- Output: { invitation_id }

### accept_label_invite
- Method: Edge Function or RPC
- Input: { token: string }
- Steps: validate token; upsert user by email (if no account); insert label_members; mark invitation accepted
- Output: { label_id }

### link_artist_to_label
- Method: Edge Function
- Input: { label_id: uuid, creator_profile_id: uuid }
- AuthZ: owner/admin/editor of label
- Steps: create managed_profiles row as pending; notify creator
- Output: { link_id }

### accept_label_link_request
- Method: Edge Function or RPC
- Input: { token: string }
- Steps: validate; set managed_profiles.status='active'
- Output: { link_id }

### switch_content_owner
- Method: RPC
- Input: { table: text, id: uuid, to_owner_type: 'label'|'profile', to_owner_id: uuid }
- AuthZ: ensure caller has rights over both from and to owner contexts
- Steps: update record owner fields; log audit

### request_ownership_transfer
- Method: Edge Function
- Input: { label_id: uuid, to_user_id?: uuid, to_email?: string }
- AuthZ: current owner only
- Steps: create ownership_transfer_requests row + email token

### accept_ownership_transfer
- Method: Edge Function
- Input: { token: string }
- Steps: validate; update label_members: new owner=owner, old owner→admin

### request_label_downgrade
- Method: Edge Function
- Input: { label_id: uuid, payload: json }
- AuthZ: owner only
- Steps: create deletion_requests row (type='downgrade'); send confirm email

### confirm_label_delete
- Method: Edge Function
- Input: { token: string }
- Steps: validate; perform destructive ops per policy; mark confirmed

### claim_admin_created_profile
- Method: Edge Function
- Input: { token: string, password?: string }
- Steps: if user exists by email, attach; else create user; add as owner; mark labels.claimed_at

### Email Templates
- Member invite: contains label name, role, accept link, expiry
- Claim profile: label name, accept link, expiry
- Ownership transfer: request + accept
- Deletion/downgrade confirmations

### Token Rules
- Single-use; short expiry (e.g., 7 days); opaque random IDs; stored hashed if desired
- Revoke on resend; audit created_by, ip, user agent (optional)



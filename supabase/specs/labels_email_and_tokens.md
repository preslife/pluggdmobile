## Email + Token Specification (Labels/Teams)

### Tokens
- Purpose: invitation, claim, ownership transfer, delete/downgrade confirmation, artist link
- Structure: opaque random string (>= 32 chars), stored as plaintext or hashed (preferred: hashed + salt)
- Fields: token, label_id, context (invite|claim|transfer|delete|artist_link), target email/user, expires_at, created_at, used_at
- Expiry: default 7 days; ownership transfer 48h; delete confirm 24h
- Rotation: creating a new token immediately invalidates previous unredeemed tokens for the same context
- Security: single-use; mark used_at on success; rate-limit redemption; include user-agent/ip in logs (optional)

### Emails
1) Member Invitation
   - Subject: "You’ve been invited to join {Label}"
   - Body: role, who invited, link, expiry, help contact
   - CTA: Accept Invitation → /invite/accept?token=...

2) Claim Label Profile
   - Subject: "Claim your label profile: {Label}"
   - Body: created by admin; link; expiry
   - CTA: Claim Profile → /claim/label?token=...

3) Ownership Transfer
   - Subject: "Ownership transfer requested for {Label}"
   - Body: from→to details; link
   - CTA: Accept Transfer → /label/transfer/accept?token=...

4) Deletion/Downgrade Confirmation
   - Subject: "Confirm {Action} for {Label}"
   - Body: summary of consequences; link; final warning
   - CTA: Confirm → /label/delete/confirm?token=...

5) Artist Link Request
   - Subject: "{Label} requests to link to your profile"
   - Body: what linking means; link to accept
   - CTA: Approve Link → /artist/link/accept?token=...

### Delivery
- Use Supabase functions to enqueue messages to your mail provider (Resend/SES/etc.)
- Store templates with variables; localize copy later
- Log sends and bounces (optional)



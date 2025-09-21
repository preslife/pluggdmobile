## Migration + Rollout Plan (Labels/Teams)

### Preflight
- Feature flag: LABELS_ENABLED=false (prod); true in dev
- Apply schema + RLS in dev; seed a test label and users

### Migration (if legacy `profiles.is_label` exists)
1) For each profile with is_label=true:
   - Insert into labels (slug=name-or-existing, name, logo, cover, contact_email, owner_user_id=profiles.user_id)
   - Insert label_members (role='owner')
   - Map any public routes from /u/:slug to /label/:slug via redirect
2) Owner-aware content:
   - For content without explicit owner_type/owner_id but known to be label content, set owner_type='label', owner_id=labels.id
3) Verify no duplicate slugs; resolve with suffix if needed

### Rollout Phases
1) Admin-only: enable admin_create_managed_label + claim flow
2) Upgrade flow for existing creators
3) Signup toggle for new users: Individual vs Label/Team
4) Publish-as UI in all content editors

### Safeguards
- Journals + backups before each step
- Rate-limit invites and token redemption
- Monitoring: log function failures and email bounces

### Reversion
- If issues detected, disable LABELS_ENABLED, revert feature visibility, and pause new label creation; existing data remains intact



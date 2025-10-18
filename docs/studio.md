# Creator Studio Service Contracts

The Creator Studio UI now consumes a service layer built on Supabase RPCs. This section documents the key contracts that power the CRM, catalog, and crowdfunding modules.

## `crm_list_contacts`

Returns paginated, role-aware CRM contacts enriched with lifecycle metrics.

- **Signature**: `crm_list_contacts(p_creator_id uuid, p_actor_id uuid, p_limit int = 50, p_offset int = 0, p_query text = null, p_tags text[] = null, p_segment_id uuid = null)`
- **Authorization**: The actor must be the creator or an admin/editor member of a label owned by the creator.
- **Response** (`jsonb`):
  - `items`: ordered array of contacts with fields mirroring `crm_contacts_enriched` (spend, membership, interaction timestamps, computed tags).
  - `total_count`: total contacts that match the current filters.
  - `limit` / `offset`: effective pagination parameters.
  - `summary`: aggregate analytics used by the UI cards:
    - `totalContacts`, `activeContacts`, `vipContacts`
    - `totalRevenue` (lifetime GMV in creator currency)
    - `emailSubscribers`
    - `salesCount`, `membershipCount`
    - `crowdfundingRaised`, `crowdfundingSupporters`
- **Companion view**: `crm_contacts_enriched` exposes the shape required by exports and edge functions. `get_crm_contacts` now delegates to this view for backward compatibility.

### Usage notes

- Search (`p_query`) checks email, username, and full name.
- Tag filters (`p_tags`) accept both source tags (`customer`, `member`, etc.) and computed tags such as `vip` or `active_member`.
- Segment filters leverage `crm_segment_members` on the backend so the UI no longer needs to join client-side.

## `catalog_list_items`

Provides a normalized catalog feed across releases, beats, bundles, merchandise, and collectibles.

- **Signature**: `catalog_list_items(p_actor_id uuid, p_owner_user_id uuid = null, p_owner_label_id uuid = null, p_types text[] = null, p_status text[] = null, p_search text = null, p_limit int = 50, p_offset int = 0)`
- **Authorization**: Actor must match the requested owner (`p_owner_user_id`) or be an admin/editor of the requested label (`p_owner_label_id`). When `p_owner_user_id` is omitted it defaults to the actor.
- **Response** (`jsonb`):
  - `items`: array of catalog entries with fields: `item_type`, `item_id`, owner identifiers, pricing/sales summaries (`price_cents`, `sales_count`, `revenue_cents`), timestamps, media URL, and `extra_metadata` for type-specific context.
  - `total_count`, `limit`, `offset`: pagination metadata for list views.
- **Backing view**: `catalog_items_overview` unifies owner resolution so the UI can filter by user or label without additional joins.

### Usage notes

- `item_type` values map to Creator Studio tabs (`release`, `beat`, `bundle`, `merch`, `collectible`).
- `extra_metadata` contains lightweight descriptors (e.g., release date, BPM/key, bundle configuration) intended for badges and tooltips.
- Pagination is capped at 200 rows per request to protect table scans when large catalogs are present.

## `crowdfunding_list_campaigns`

Delivers paginated crowdfunding campaigns with nested rewards, supporters, and status history.

- **Signature**: `crowdfunding_list_campaigns(p_creator_id uuid, p_actor_id uuid, p_limit int = 20, p_offset int = 0)`
- **Authorization**: Same model as CRM—creators or authorised label teammates.
- **Response** (`jsonb`):
  - `items`: campaign objects including embedded `rewards`, `supporters` (with supporter profile snapshot), and `status_history` arrays ordered for UI consumption.
  - `summary`: totals for analytics chips: `totalRaised`, `supporterCount`, `liveCampaigns`.
  - `total_count`, `limit`, `offset` for pagination.

### Usage notes

- Monetary values are normalised to creator currency in pounds; the UI formats the values before rendering.
- Supporter payloads include contribution timestamps so the timeline view can be assembled without additional queries.
- Pagination defaults to 20 entries but may be reduced for tab-heavy layouts; data remains sorted by `created_at DESC`.

---

Keep this document updated when expanding the service layer so downstream teams (edge functions, integrations, QA) can rely on the contracts referenced here.

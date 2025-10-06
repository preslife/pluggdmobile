# Royalty Split Offers & Payout Distribution

This guide explains how creators and administrators manage split approvals and payout distribution after the split-offer enhancements.

## Overview

Royalty splits now flow through two layers:

1. **Offers** (`content_split_offers`) capture the initial proposal from the content owner to collaborators.
2. **Locked splits** (`content_splits`) are created automatically when a collaborator accepts an offer. Once any order exists for the content, both offers and splits become read-only through database triggers.

Completed orders recorded through Stripe trigger `creator_statements` that store the final amounts per collaborator. Stripe payout automation (`process-producer-payouts`) aggregates those statements and creates entries in `payouts`/`payout_statements` when funds are sent via Stripe Connect.

## Creator experience

1. **Create offers.** From the Royalty Splits Manager creators can invite collaborators. Pending rows are stored in `content_split_offers` until collaborators accept.
2. **Acceptance.** When a collaborator updates an offer to `accepted`, a trigger inserts or updates a matching row in `content_splits` and timestamps the response.
3. **Locking.** Before any insert/update/delete on either offers or splits the `ensure_content_unlocked` trigger checks `content_has_orders`. If the content has purchases (via store bundles, beat sales, release/sample-pack purchases) the mutation is rejected and the UI surfaces a locked state.
4. **Financial visibility.** The Financials module reads the new `creator_statements`/`payouts` data to show real earnings, download CSVs, and monitor Stripe Connect status.

## Admin considerations

- **Stripe webhook** (`stripe-webhook`) now allocates every qualifying line-item across the locked splits, writing proportional gross/fee/net amounts (and the split percentage) into `creator_statements`.
- **Automated payouts** (`process-producer-payouts`) consumes ready statements, verifies Connect eligibility, issues Stripe transfers, and links the paid statements to the payout record via `payout_statements`.
- **Auditing.** Every statement row stores metadata (product name, session id, line item id) so ops teams can reconcile transactions quickly. CSV exports are available from the UI for both statements and payouts.

## Collaborator acceptance flow

1. Content owner creates offers via the UI (`content_split_offers`).
2. Collaborator authenticates and updates `status` to `accepted` (or `declined`). The response is timestamped and—if accepted—the percentage is copied into `content_splits`.
3. Subsequent purchases immediately reference `content_splits` when the Stripe webhook runs, so payouts always mirror the accepted agreement.
4. After orders exist, attempts to edit offers/splits raise an error, protecting historical revenue attribution.

## Reporting

- `creator_statements` rows use `split_percent` to connect the collaborator’s share to the recorded revenue. Creator analytics now summarises revenue per content using this value so collaborators can see how approved splits impact earnings.
- `payouts` + `payout_statements` capture which statements were included in each Stripe transfer, giving finance teams a full audit trail.

Refer to these tables when debugging:

| Table | Purpose |
| --- | --- |
| `content_split_offers` | Pending collaborator approvals and responses. |
| `content_splits` | Accepted splits used for attribution and payouts. |
| `creator_statements` | Net earnings per collaborator/content per transaction. |
| `payouts` | Stripe transfer metadata and status per creator. |
| `payout_statements` | Junction linking paid statements to a payout. |


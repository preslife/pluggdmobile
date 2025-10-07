PLUGGD -
About The Project

This project provides the foundational data structure for a multi-faceted music ecosystem. The schema supports a wide range of functionalities, from selling beats and managing releases to hosting producer battles, offering educational courses, and fostering a vibrant community. The platform is designed to handle complex relationships between users, content, sales, and social interactions.
Key Features
The database schema supports a rich feature set, including:
• User & Profile Management: Robust profiles for artists and labels, including bios, social links, verification status, and user stats.
• Music & Content Hosting: Detailed tables for managing releases, tracks, beats, audio files, and sample packs.
• E-commerce & Monetisation: A complete sales and payout system including beat sales, release purchases, orders, subscriptions, artist tips, and payout records for producers. Producers can connect Stripe accounts for payouts.
• Community & Social Engagement: Features for building a community, such as posts, comments, likes, user follows, activity feeds, and collaborative playlists.
• Creator Tools: A suite of tools for creators including automations for social posts, a unified inbox for messages, and smartlinks for releases/beats.
• Analytics & Insights: In-depth analytics for artists, releases, and audience demographics, as well as metrics on creator revenue and engagement.
• Competitions & Challenges: A framework for hosting beat battles, contests, and monthly challenges to drive user engagement, complete with entries, voting, and prize pools.
• Collaboration Hub: Functionality to support collaboration projects, session rooms for live interaction, and detailed tracking of collaborators on beats and releases.
• Licensing & Contracts: A system for managing beat licenses, contract templates, and digital contract signing.
• Educational Content: A learning management system for creating and selling courses, tracking user progress, and issuing certificates.
• Creator Stores: The ability for creators to sell custom merchandise, digital bundles, and unique collectibles directly to their fans.
• Professional Directory & Bookings: A directory for verified music professionals where clients can submit booking requests.
• Label Management: Tools for music labels to manage their members, invite new users, and handle ownership transfers.
• Administration & Moderation: Comprehensive tools for content reporting, moderation actions, and system security auditing.
Database Schema Overview
This schema is designed for a PostgreSQL database, specifically for use with the Supabase platform. It defines over 100 tables that create a relational data model for a music-focused application. The structure revolves around core entities such as users (auth.users), profiles, beats, releases, and various transaction or event tables that link them together.
Core Tables
Below is a selection of key tables and their primary functions:
• public.profiles: Stores extended user information beyond the authentication record, such as username, bio, avatar, and user type.
• public.releases: Contains metadata for music releases like singles, EPs, and albums, including artist info, release date, and distribution links.
• public.beats: Manages beats created by producers, including details like title, genre, BPM, price, and audio file locations.
• public.beat_sales: Records every transaction involving the sale of a beat, detailing the buyer, producer, price, and commission.
• public.purchases: A central table for tracking user purchases of beats, including payment status and licensing information.
• public.community_posts: The foundation for the social feed, allowing creators to post text and media.
• public.battles: Manages beat battle competitions, including schedules, entry fees, and prize pools.
• public.licensing_contracts: Handles the generation and status of legal contracts between producers and artists for beat licenses.
• public.courses: Defines educational courses offered on the platform, including instructor and content details.
• public.labels: Manages information about record labels on the platform, including members and ownership.
• public.api_tokens: Allows for the generation of API tokens for users to interact with the platform programmatically.
Getting Started
To use this schema, you can inspect the SQL files in this repository to understand the data architecture. The primary schema definition provides the table structures, constraints, and relationships needed to power the application's backend.
This section can be expanded with instructions on how to set up the database, run migrations, and connect the application.
Disclaimer
Warning: The schema provided in this repository is for contextual understanding and architectural reference only. It is not guaranteed to be executable in its current state. The order of table creation and the dependencies between them may not be valid for direct execution.

Orders & Wallet
This section explains how commerce events propagate across orders, wallet ledgers, and a customer's digital library.

Order Fulfillment Data Flow
1. Customer places a store order (public.store_orders) with one or more line items.
2. Successful payment triggers creation of wallet ledger entries (public.wallet_ledger) that credit the seller and record the platform's liability to deliver content.
3. A fulfillment job reads the order + ledger entry IDs and creates corresponding library entries (public.user_library) so the buyer gains access to digital goods.
4. The order record stores the correlation_id used across these tables so operators can trace the chain from the initial order to wallet movements and library unlocks.

```
[store_orders] --(order_id, correlation_id)--> [wallet_ledger]
       |                                          |
       v                                          v
[order_items] ------------------------------> [wallet_manual_entries]
       |                                          |
       v                                          v
 [library_fulfillment_job] --(ledger_id)--> [user_library]
```

Refunds & Claw-backs
• Refund requests or chargebacks create negative ledger entries that reverse the spend (wallet_ledger.amount < 0) and mark the original ledger_id in reversal_of for traceability.
• The same reversal logic updates public.wallet_balances via triggers so the customer's available balance reflects the refund.
• Library entries linked to refunded order_items are soft-deleted (user_library.revoked_at timestamp) to remove access while keeping the audit trail.

Credit Spend Tracking
• Wallet credit purchases generate positive ledger entries with source = 'order_credit_purchase'.
• When customers spend credit, a debit ledger entry is inserted with correlation_id referencing the originating order_item; the net wallet balance is enforced with check constraints and balance recalculation triggers.
• Manual adjustments (public.wallet_manual_entries) use the same ledger table, differentiating by entry_type, ensuring audits include both automated and human initiated changes.

Integrated Monitoring & Logging
• Correlation IDs: store_orders.correlation_id is propagated to wallet_ledger and user_library events, and is logged in the payment service (structured logs in Supabase functions) for end-to-end tracing.
• Alerting: A Supabase function emits events to the observability pipeline (e.g., Logflare/Webhooks) when wallet_ledger.balance_after deviates from expected totals or when library provisioning fails, triggering PagerDuty alerts.
• Audit dashboards: SQL views aggregate wallet_ledger and manual entries for daily reconciliation; Grafana panels highlight unmatched credits or stuck fulfillments using the shared correlation IDs.

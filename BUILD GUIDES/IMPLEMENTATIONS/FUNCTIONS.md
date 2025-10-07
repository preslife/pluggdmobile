# PLUGGD — Edge Functions Catalog

This document lists our Supabase Edge Functions, their purpose, auth model, and key dependencies.

- check-subscription
  - Purpose: Verify/refresh a user’s Stripe subscription status and sync to Supabase.
  - Auth: Requires JWT (user session)
  - Depends on: STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY

- create-checkout
  - Purpose: Start Stripe Checkout for subscriptions.
  - Auth: Requires JWT
  - Depends on: STRIPE_SECRET_KEY

- customer-portal
  - Purpose: Open Stripe Billing Portal for subscription management.
  - Auth: Requires JWT
  - Depends on: STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY

- create-payment
  - Purpose: One-off payments via Stripe Checkout (mode: payment).
  - Auth: Requires JWT (guest optional pattern available)
  - Depends on: STRIPE_SECRET_KEY

- create-course-payment
  - Purpose: Course payments via Stripe.
  - Auth: Requires JWT
  - Depends on: STRIPE_SECRET_KEY

- create-store-checkout
  - Purpose: Store cart checkout session initialization.
  - Auth: Requires JWT
  - Depends on: STRIPE_SECRET_KEY

- create-subscription
  - Purpose: Create a subscription (alternative to create-checkout when needed).
  - Auth: Requires JWT
  - Depends on: STRIPE_SECRET_KEY

- create-connect-account
  - Purpose: Stripe Connect onboarding for producers.
  - Auth: Requires JWT
  - Depends on: STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY

- process-producer-payouts
  - Purpose: Transfer pending producer payouts to connected Stripe accounts.
  - Auth: Requires JWT (producer); service role used for DB updates
  - Depends on: STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY

- stripe-webhook
  - Purpose: Handle event-driven updates from Stripe (subs, payments).
  - Auth: Public endpoint; verified via STRIPE_WEBHOOK_SECRET
  - Depends on: STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY

- paypal-payout
  - Purpose: PayPal payout integration (if enabled) for producers.
  - Auth: Requires JWT (producer); service role used for DB updates
  - Depends on: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET

- elevenlabs-text-to-speech
  - Purpose: Generate speech/voice content from text.
  - Auth: Requires JWT
  - Depends on: ELEVENLABS_API_KEY

- transcribe-audio
  - Purpose: Transcribe audio files to text.
  - Auth: Requires JWT
  - Depends on: OPENAI_API_KEY (or related speech API key)

- generate-lyrics
  - Purpose: AI-assisted lyric generation.
  - Auth: Requires JWT
  - Depends on: OPENAI_API_KEY

- fetch-spotify-analytics
  - Purpose: Fetch artist analytics from Spotify APIs.
  - Auth: Requires JWT
  - Depends on: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET

- fetch-youtube-analytics
  - Purpose: Fetch channel/video analytics via YouTube Data API.
  - Auth: Requires JWT
  - Depends on: YOUTUBE_API_KEY

- send-booking-notification
  - Purpose: Send transactional emails/notifications for bookings.
  - Auth: Requires JWT or service usage
  - Depends on: RESEND_API_KEY (or email provider key)

- send-subscription-email
  - Purpose: Email notifications for subscription lifecycle events.
  - Auth: Service usage
  - Depends on: RESEND_API_KEY

## Stripe Sandbox — Membership Checkout Flow

Use this checklist when validating the new membership checkout in the Stripe sandbox:

1. Publish a `membership_tier` with an attached Stripe price (stored in `metadata.stripe_price_id`).
2. Call the `create-fan-subscription` edge function with `creatorId` and `membershipTierId` to generate the Checkout URL.
3. Complete the hosted checkout using Stripe test card `4242 4242 4242 4242` (any future expiry, CVC, ZIP).
4. After redirect, confirm `fan_sub=success` clears from the URL and the membership state refreshes on the profile.
5. Verify Supabase tables:
   - `memberships` row upserted with the correct tier, status, current period, and Stripe IDs.
   - `membership_tiers.current_members` recalculated for the tier.
6. Inspect the `stripe-webhook` function logs for `membership_sync` entries and ensure Discord sync was invoked (mocked in local dev).
7. Repeat the flow cancelling the subscription from the Stripe dashboard; the webhook should mark the membership `cancelled` and decrement tier counts.

Notes
- All functions include CORS headers, and most require Authorization: Bearer <token>.
- Service role key is used only within edge functions for privileged writes that must bypass RLS.

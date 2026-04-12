# Pluggd Mobile: Post-setup Checklist

These steps require your Supabase/Stripe/Agora credentials and your local machine. Run them in order once you’re ready.

## 1) Install deps & apply native config
```
cd pluggd-mobile
npm install
npx expo prebuild
# Build a custom dev client (required for Stripe/Agora)
npx expo run:ios   # or
npx expo run:android
# For production/dev preview use EAS if preferred
eas build --profile development --platform ios|android
```

## 2) Configure Supabase secrets (prod or stage)
```
supabase secrets set --env prod \
  STRIPE_SECRET_KEY=sk_live_xxx \
  AGORA_APP_ID=45048960610e44faa69288cee475c543 \
  AGORA_APP_CERTIFICATE=7c4d7038e7f3439386e65e33c97bb4cb \
  STRIPE_WEBHOOK_SECRET=whsec_xxx   # optional but recommended
```

## 3) Deploy the mobile Stripe function
```
cd supabase
supabase functions deploy create-mobile-payment-intent --project-ref qkwvqmubhyondemhasjp
```

## 4) Seed or verify data (so UI isn’t empty)
- `releases`, `beats`, `playlists` tables: add a handful of rows with images/urls/prices.
- `session_rooms`: add a demo room (id `demo-room`, status `scheduled` or `live`).
- `purchases`: optional seed for history view.

## 5) Environment files
- Confirm `pluggd-mobile/.env` is present with client-safe keys:
  - `EXPO_PUBLIC_SUPABASE_URL=https://qkwvqmubhyondemhasjp.supabase.co`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY=...`
  - `EXPO_PUBLIC_AGORA_APP_ID=45048960610e44faa69288cee475c543`
  - `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`
- Keep Stripe secret + Agora certificate only in Supabase secrets (not in git).

## 6) Device testing
- Launch the custom dev client, log in, and verify:
  - Marketplace → Checkout → PaymentSheet completes.
  - Live → Host/Join Demo joins video with Agora token.
  - Auth session persists between launches.

## 7) Optional next wiring
- Connect chat/Q&A to Supabase Realtime.
- Hook receipts/download links to signed URLs or receipt PDFs.
- Add webhooks in Stripe to hit `stripe-webhook` function with `STRIPE_WEBHOOK_SECRET`.

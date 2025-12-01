# Pluggd Deployment Checklist

## Pre-Deployment Requirements

### 1. Domain & DNS
- [ ] Domain registered (pluggd.fm or your domain)
- [ ] DNS configured to point to hosting provider
- [ ] SSL certificate ready (most hosts provide free via Let's Encrypt)

### 2. Hosting Platform
Choose one:
- [ ] **Vercel** (recommended for React) - Free tier available
- [ ] **Netlify** - Free tier available
- [ ] **Railway** - Good for full-stack
- [ ] **Your own server** - More complex

### 3. Supabase Production
- [ ] Create production Supabase project (separate from dev)
- [ ] Note down production URL and anon key
- [ ] Run all migrations on production database

---

## Environment Variables

### For Frontend (.env or hosting dashboard)

```env
# Supabase (REQUIRED)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Stripe (REQUIRED for payments)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# Feature Flags
VITE_FEATURE_LMS=true

# Optional
VITE_SENTRY_DSN=your-sentry-dsn
VITE_GA_MEASUREMENT_ID=G-XXXXXXX
```

### For Supabase Edge Functions

Set these in Supabase Dashboard → Edge Functions → Secrets:

```
# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Email (if using)
RESEND_API_KEY=re_xxxxx

# Push Notifications (if using)
VAPID_PUBLIC_KEY=xxxxx
VAPID_PRIVATE_KEY=xxxxx

# Agora (for live streaming)
AGORA_APP_ID=xxxxx
AGORA_APP_CERTIFICATE=xxxxx
```

---

## Stripe Production Setup

### 1. Switch to Live Mode
- [ ] Log into Stripe Dashboard
- [ ] Toggle from "Test" to "Live" mode
- [ ] Get live publishable key (pk_live_...)
- [ ] Get live secret key (sk_live_...)

### 2. Configure Webhooks
- [ ] Go to Developers → Webhooks
- [ ] Add endpoint: `https://your-supabase-url/functions/v1/stripe-webhook`
- [ ] Select events:
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- [ ] Copy webhook signing secret (whsec_...)
- [ ] Add to Supabase Edge Function secrets

### 3. Connect Account (for payouts)
- [ ] Enable Stripe Connect in dashboard
- [ ] Set platform fee percentage
- [ ] Configure payout schedule

---

## Supabase Production Setup

### 1. Create Production Project
- [ ] Go to supabase.com → New Project
- [ ] Choose region closest to your users
- [ ] Save the project URL and anon key

### 2. Run Migrations
```bash
# Link to production project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
npx supabase db push
```

### 3. Deploy Edge Functions
```bash
# Deploy all functions
npx supabase functions deploy

# Or deploy specific function
npx supabase functions deploy stripe-webhook
```

### 4. Set Edge Function Secrets
In Supabase Dashboard → Edge Functions → Secrets:
- [ ] Add all secrets from list above

### 5. Configure Auth
- [ ] Go to Authentication → Settings
- [ ] Set Site URL to your production domain
- [ ] Add redirect URLs for OAuth
- [ ] Configure email templates (optional)

### 6. Enable RLS
- [ ] Verify Row Level Security is enabled on all tables
- [ ] Test that users can only access their own data

---

## Build & Deploy

### Build Locally First
```bash
# Install dependencies
npm install

# Build production bundle
npm run build

# Test production build locally
npm run preview
```

### Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# For production
vercel --prod
```

### Deploy to Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy

# For production
netlify deploy --prod
```

---

## Post-Deployment Checks

### 1. Smoke Test (5 mins)
- [ ] Homepage loads
- [ ] Can sign up
- [ ] Can sign in
- [ ] Can view marketplace
- [ ] Can play audio

### 2. Payment Test
- [ ] Make a real small purchase (£1 test product)
- [ ] Verify payment received in Stripe
- [ ] Verify creator sees the sale
- [ ] Refund the test purchase

### 3. Check Logs
- [ ] Check Supabase logs for errors
- [ ] Check Edge Function logs
- [ ] Check Vercel/Netlify function logs

---

## Monitoring Setup

### 1. Error Tracking (Sentry)
- [ ] Create Sentry project
- [ ] Add VITE_SENTRY_DSN to env
- [ ] Verify errors are captured

### 2. Analytics (Google Analytics)
- [ ] Create GA4 property
- [ ] Add VITE_GA_MEASUREMENT_ID to env
- [ ] Verify pageviews tracked

### 3. Uptime Monitoring
- [ ] Set up UptimeRobot (free) or similar
- [ ] Monitor homepage and API endpoints
- [ ] Set up alerts for downtime

---

## Security Checklist

- [ ] All API keys are in environment variables (not in code)
- [ ] Stripe webhook signature verification enabled
- [ ] RLS policies active on all tables
- [ ] Admin routes protected
- [ ] HTTPS enforced
- [ ] No sensitive data in console logs

---

## Go-Live Checklist

### Day Before Launch
- [ ] Final backup of database
- [ ] All team members know launch time
- [ ] Support email ready
- [ ] Social media posts scheduled

### Launch Day
- [ ] Deploy latest code
- [ ] Clear CDN cache if using one
- [ ] Test critical flows one more time
- [ ] Announce on social media
- [ ] Monitor logs for first hour

### Post-Launch
- [ ] Respond to any user issues quickly
- [ ] Monitor error rates
- [ ] Check payment processing
- [ ] Celebrate! 🎉

---

## Rollback Plan

If something goes wrong:

```bash
# Vercel - rollback to previous deployment
vercel rollback

# Or redeploy a specific commit
git checkout <previous-commit>
npm run build
vercel --prod
```

For database issues:
- Supabase has point-in-time recovery
- Contact Supabase support if needed

---

## Support Contacts

- **Supabase:** support@supabase.io
- **Stripe:** stripe.com/support
- **Vercel:** vercel.com/support
- **Your domain registrar:** Check their support

---

*Last updated: December 1, 2025*


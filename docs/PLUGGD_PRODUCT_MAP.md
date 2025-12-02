# Pluggd Platform - Complete Product Map

**Version:** 1.0  
**Last Updated:** December 2, 2025  
**Platform:** pluggd.fm (Hub) | live.pluggd.fm (Live)

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [User Types](#user-types)
3. [Core Modules](#core-modules)
4. [Fan Features](#fan-features)
5. [Creator Features](#creator-features)
6. [Live Platform](#live-platform)
7. [Learning Management System (LMS)](#learning-management-system)
8. [Marketplace & Commerce](#marketplace--commerce)
9. [Creator Studio](#creator-studio)
10. [Label Studio](#label-studio)
11. [Administration](#administration)
12. [Integrations & APIs](#integrations--apis)
13. [Monetization Features](#monetization-features)
14. [Technical Infrastructure](#technical-infrastructure)

---

## Platform Overview

Pluggd is a comprehensive music industry platform connecting **creators** (artists, producers, beat makers) with **fans** while providing professional tools for music creation, distribution, monetization, and community building.

### Dual-Domain Architecture

| Domain | Purpose | Target Users |
|--------|---------|--------------|
| `pluggd.fm` | Main hub - discovery, marketplace, community | Fans & Creators |
| `live.pluggd.fm` | Live sessions, battles, events | Live participants |

---

## User Types

### 1. Fans
- Discover and stream music
- Purchase beats, releases, sample packs
- Subscribe to creator memberships
- Attend live events
- Take courses in Pluggd Academy
- Participate in community

### 2. Creators (Artists/Producers)
- Upload and sell music
- Create and manage releases
- Sell beats and sample packs
- Host live sessions
- Build fan memberships
- Collaborate with others
- Access analytics and earnings

### 3. Labels
- Manage artist roster
- Oversee catalog
- Handle financials and payouts
- Distribution management
- Storefront customization

### 4. Administrators
- Platform moderation
- User management
- Content catalog oversight
- Payout processing
- Analytics monitoring

---

## Core Modules

### 🎵 Global Player
**Location:** `src/components/GlobalPlayer/`

| Component | Description |
|-----------|-------------|
| `GlobalPlayer.tsx` | Main player wrapper |
| `GlobalPlayerProvider.tsx` | State management via React Context |
| `MicroPlayer.tsx` | Compact bottom bar player |
| `ExpandedPlayer.tsx` | Full-screen player with tabs |
| `ListeningHistoryTracker.tsx` | Tracks playback for "Continue Listening" |

**Features:**
- Play/Pause, Skip, Seek
- Volume control
- Shuffle & Repeat modes
- Queue management
- Listening history
- Like/Favorite tracks
- Share functionality
- BarFlow integration (lyrics writing)

### 🎤 BarFlow (Lyrics Studio)
**Location:** `src/components/Barflow.tsx`

A complete songwriting environment integrated with the global player.

**Features:**
- Beat/track playback with loop regions
- Voice recording with live timer
- Lyric editor with formatting
- AI-powered lyric generation
- Rhyme finder
- Metronome
- Project management (save/load)
- Export to PDF
- Smart templates

### 🔍 Universal Search
**Location:** `src/pages/SearchPage.tsx`, `src/components/UniversalSearch.tsx`

**Searchable Content:**
- Releases & Tracks
- Beats
- Artists/Creators
- Sample Packs
- Courses
- Events
- Community Posts

---

## Fan Features

### 🏠 Fan Home (`/home`)
**Location:** `src/pages/FanHome.tsx`

- Continue Listening (resume tracks)
- Personalized recommendations
- Featured releases
- Trending content
- Upcoming events

### 📚 Library (`/library`)
**Location:** `src/pages/Library.tsx`

- Purchased releases
- Owned beats
- Sample packs
- Course enrollments
- Playlists
- Download history

### ❤️ Favorites (`/favorites`)
**Location:** `src/pages/Favorites.tsx`

- Favorited tracks
- Followed artists
- Saved beats
- Wishlist items

### 🛒 Store & Marketplace

| Route | Page | Description |
|-------|------|-------------|
| `/marketplace` | `Marketplace.tsx` | Beat marketplace with filters |
| `/store` | `Store.tsx` | Merch and physical products |
| `/sample-pack-store` | `SamplePackStore.tsx` | Sample pack marketplace |

### 📊 Charts (`/charts`)
**Location:** `src/pages/Charts.tsx`

- Top releases
- Trending beats
- Rising artists
- Genre charts

### 📻 Radio (`/radio`)
**Location:** `src/pages/Radio.tsx`

- Curated playlists
- Genre stations
- Mood-based listening

### 🎓 Learn (Pluggd Academy) (`/learn`)
**Location:** `src/pages/Learn.tsx`, `src/pages/LearnCourse.tsx`

- Course catalog
- Video lessons
- Quizzes
- Certificates
- Progress tracking

### 👥 Community (`/community`)
**Location:** `src/pages/Community.tsx`

- Activity feed
- Creator spotlights
- Community posts
- Collaborations
- Events calendar

### 🎫 Events (`/events`)
**Location:** `src/pages/Events.tsx`, `src/pages/EventDetail.tsx`

- Event discovery
- Ticket purchase
- Event details
- Calendar integration

### 🏆 Gamification (`/gamification`)
**Location:** `src/pages/Gamification.tsx`

- XP & Levels
- Badges & Achievements
- Quests
- Leaderboards
- Rewards

---

## Creator Features

### 📊 Creator Dashboard (`/creator/dashboard`)
**Location:** `src/pages/CreatorDashboard.tsx`

**Overview Cards:**
- Total earnings
- Stream counts
- Subscriber count
- Recent sales

**Quick Actions:**
- Upload release
- Create beat listing
- Schedule live session
- View analytics

### 🎨 Creator Studio (`/studio/*`)
**Location:** `src/pages/CreatorStudio.tsx`, `src/components/CreatorStudio/`

Complete creator workspace with modules:

| Module | Route | Description |
|--------|-------|-------------|
| Releases | `/studio/releases` | Manage music releases |
| Beats | `/studio/beats` | Beat catalog management |
| Sample Packs | `/studio/samples` | Sample pack uploads |
| Memberships | `/studio/memberships` | Fan subscription tiers |
| Store | `/studio/store` | Merch & products |
| Live | `/studio/live` | Session scheduling |
| Analytics | `/studio/analytics` | Performance metrics |
| Settings | `/studio/settings` | Creator preferences |

### 🎵 Release Management

| Route | Page | Description |
|-------|------|-------------|
| `/release/new` | `ReleaseBuilder.tsx` | Create new release |
| `/my-releases` | `MyReleases.tsx` | Manage releases |
| `/release/:id` | `ReleaseDetail.tsx` | Release page |

**Release Features:**
- Multi-track upload
- Cover art
- Metadata (genre, mood, tags)
- Pricing (free/paid)
- Membership gating
- Scheduled publishing
- Distribution (DSP export)
- Splits management
- Analytics

### 🎹 Beat Management
**Location:** `src/pages/BeatDetail.tsx`, `src/components/BeatUploadForm.tsx`

**Features:**
- Beat uploads
- License templates (Basic, Premium, Exclusive)
- Pricing tiers
- Preview clips
- Tag management
- Embeddable players

### 📦 Sample Packs
**Location:** `src/pages/SamplePackUpload.tsx`, `src/pages/SamplePackStore.tsx`

**Features:**
- Pack creation
- File organization
- Preview generation
- Pricing
- Download tracking

### 👥 Fan Subscriptions
**Location:** `src/pages/CreatorSubscriptions.tsx`

**Tier Features:**
- Multiple tiers (Bronze, Silver, Gold, etc.)
- Custom perks per tier
- Content gating
- Discord integration
- Exclusive access rules

### 💰 Earnings & Payouts

| Route | Description |
|-------|-------------|
| `/dashboard/creator/earnings` | Earnings overview |
| `/dashboard/creator/splits` | Revenue splits |
| `/dashboard/wallet` | Wallet management |
| `/dashboard/payouts` | Payout history |

### 📈 Analytics

| Route | Description |
|-------|-------------|
| `/dashboard/creator/analytics` | Stream & sales analytics |
| `/dashboard/creator/growth` | Growth metrics |
| `/analytics` | Detailed analytics |

### 🤝 Collaboration
**Location:** `src/pages/Collaborate.tsx`

**Features:**
- Find collaborators
- Commission requests
- Project management
- Split agreements
- Contract signing

### 🏆 Contests & Challenges
**Location:** `src/pages/Challenges.tsx`, `src/pages/ContestDetail.tsx`

**Features:**
- Beat battles
- Remix contests
- Voting
- Prizes
- Leaderboards

---

## Live Platform

**Domain:** `live.pluggd.fm` or `/live/*` routes

### 📍 Live Routes

| Route | Page | Description |
|-------|------|-------------|
| `/live` | `LiveIndex.tsx` | Live homepage |
| `/live/sessions` | `LiveSessions.tsx` | Browse sessions |
| `/live/battles` | `LiveBattles.tsx` | Battle arena |
| `/live/event/:id` | `LiveEvent.tsx` | Event page |
| `/live/sessions/:id` | `SessionRoom.tsx` | Live session room |

### 🎥 Session Features
- Real-time audio/video (Agora SDK)
- Chat & reactions
- Tipping/gifts
- Session recording
- File sharing
- Screen sharing
- Participant management

### ⚔️ Battle Features
- Bracket tournaments
- Round-based voting
- Prize pools
- Live audience

### 🎟️ Ticketing
- Free & paid events
- Early access for members
- Ticket management

---

## Learning Management System

### 📚 LMS Features
**Location:** `src/pages/Learn.tsx`, `src/pages/LearnCourse.tsx`

| Feature | Description |
|---------|-------------|
| Course Catalog | Browse available courses |
| Video Lessons | Streaming video content |
| Quizzes | Interactive assessments |
| Progress Tracking | Resume where you left off |
| Certificates | Completion certificates (PDF) |
| Enrollment | Free and paid courses |

### 🎓 Course Structure
```
Course
├── Modules
│   ├── Lessons
│   │   ├── Video content
│   │   ├── Text content
│   │   └── Resources
│   └── Quiz (optional)
└── Certificate
```

---

## Marketplace & Commerce

### 💳 Payment Processing
- Stripe Connect for creators
- Direct purchases
- Subscription billing
- Tips/donations
- Credits system

### 🛒 Product Types

| Type | Features |
|------|----------|
| Beats | License tiers, stems, instant delivery |
| Releases | Download/stream, membership gating |
| Sample Packs | Bulk downloads, preview players |
| Courses | Enrollment, lifetime access |
| Merch | Variants, shipping |
| Event Tickets | Digital delivery, check-in |
| Memberships | Recurring billing, perks |

### 💰 Credits System
**Location:** `src/pages/CreditsPurchase.tsx`, `src/services/credits/`

- Purchase credits
- Apply to purchases
- Cash out balance
- Transaction history

### 🎁 Gifting
**Location:** `src/pages/GiftClaim.tsx`

- Gift releases
- Gift codes
- Claim flow

---

## Creator Studio

### 📂 Studio Modules

```
/studio
├── /releases     → Release management
├── /beats        → Beat catalog
├── /samples      → Sample packs
├── /memberships  → Fan subscriptions
├── /store        → Merch/products
├── /live         → Live sessions
├── /analytics    → Performance data
├── /embeds       → Embed widgets
├── /settings     → Preferences
└── /developer    → API access
```

### 🔧 Creator Tools

| Tool | Description |
|------|-------------|
| Release Builder | Multi-track upload, metadata |
| Beat Uploader | License setup, pricing |
| Membership Editor | Tier creation, perks |
| Embed Generator | Custom player widgets |
| Press Kit | Downloadable media kit |
| Smart Links | Custom `/r/slug` URLs |

---

## Label Studio

### 🏢 Label Features
**Location:** `src/components/LabelStudio/`

| Module | Route | Description |
|--------|-------|-------------|
| Roster | `/studio/label/:slug/roster` | Artist management |
| Catalog | `/studio/label/:slug/catalog` | Release catalog |
| Storefront | `/studio/label/:slug/storefront` | Label store |
| Analytics | `/studio/label/:slug/analytics` | Label metrics |
| Financials | `/studio/label/:slug/financials` | Earnings & payouts |
| Settings | `/studio/label/:slug/settings` | Label configuration |

### 👥 Roster Management
- Invite artists
- Contract management
- Split agreements
- Artist profiles

### 📦 Catalog Management
- Multi-artist releases
- Compilation albums
- Distribution
- Rights management

---

## Administration

### 🔐 Admin Panel (`/admin/*`)
**Location:** `src/pages/Admin.tsx`, `src/pages/admin/`

| Route | Description |
|-------|-------------|
| `/admin` | Dashboard overview |
| `/admin/users` | User management |
| `/admin/roles` | Role permissions |
| `/admin/catalog` | Content moderation |
| `/admin/payouts` | Payout processing |
| `/admin/courses` | LMS management |
| `/admin/artists` | Artist verification |
| `/admin/products` | Store products |
| `/admin/events` | Event management |
| `/admin/analytics` | Platform analytics |
| `/admin/security` | Security settings |
| `/admin/labels` | Label oversight |
| `/admin/distribution` | DSP distribution |

### 🛡️ Moderation
- Content review queue
- Report handling
- User blocking
- Trust & safety

---

## Integrations & APIs

### 🔌 Third-Party Integrations

| Service | Purpose |
|---------|---------|
| Stripe | Payments, Connect, Subscriptions |
| Agora | Live audio/video |
| Discord | Community sync, role grants |
| Mailchimp | Email marketing |
| TikTok | Social posting |
| Spotify | Analytics import |
| YouTube | Analytics import |
| PayPal | Alternative payouts |
| ElevenLabs | Text-to-speech |

### 📡 API Features
**Location:** `supabase/functions/api-v1/`

- REST API endpoints
- API token management
- Rate limiting
- Webhook delivery
- OAuth support

### 🔗 Webhooks
- Purchase events
- Subscription changes
- Content updates
- User actions

---

## Monetization Features

### 💵 Revenue Streams

| Feature | Model |
|---------|-------|
| Beat Sales | One-time purchase, tiered licensing |
| Release Sales | Per-unit or free with membership |
| Sample Packs | One-time purchase |
| Memberships | Recurring subscriptions |
| Tips | Direct fan support |
| Live Gifts | Virtual gifts during sessions |
| Course Sales | One-time enrollment |
| Event Tickets | Ticketed entry |
| Merch | Physical product sales |

### 💳 Payout System
- Stripe Connect onboarding
- PayPal alternative
- Scheduled payouts
- Minimum thresholds
- Split distribution

### 🎯 Referral Program
**Location:** `src/pages/ReferralPage.tsx`

- Referral links
- Commission tracking
- Reward tiers

---

## Technical Infrastructure

### 🗄️ Database (Supabase/PostgreSQL)

**Key Tables:**
```
profiles              → User profiles
releases              → Music releases
tracks                → Individual tracks
beats                 → Beat listings
beat_purchases        → Transactions
release_purchases     → Release sales
sample_packs          → Sample pack products
fan_subscriptions     → Membership subscriptions
membership_tiers      → Tier definitions
live_sessions         → Session records
battles               → Battle events
courses               → LMS courses
lessons               → Course lessons
user_badges           → Gamification
wallet_transactions   → Credits/wallet
```

### ⚡ Edge Functions (134 functions)

**Categories:**
- Payment processing (`create-checkout`, `stripe-webhook`)
- Content delivery (`download-signed-url`, `verify-release-access`)
- Notifications (`send-push-notification`, `broadcast-notification`)
- Integrations (`discord-sync`, `mailchimp-sync`)
- Analytics (`analytics-processor`, `revenue-aggregator`)
- AI features (`generate-lyrics`, `transcribe-audio`)
- Live features (`manage-live-session`, `room-heartbeat`)

### 🎨 Frontend Stack

| Technology | Usage |
|------------|-------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| Tailwind CSS | Styling |
| Shadcn/ui | Component library |
| Framer Motion | Animations |
| TanStack Query | Data fetching |
| React Router v6 | Routing |
| Zustand/Context | State management |

### 📱 PWA Features
- Offline support
- Push notifications
- Install prompt
- Service worker

---

## Route Map

### Public Routes

| Route | Component | Auth |
|-------|-----------|------|
| `/` | Index | No |
| `/auth` | Auth | No |
| `/marketplace` | Marketplace | No |
| `/charts` | Charts | No |
| `/radio` | Radio | No |
| `/directory` | Directory | No |
| `/community` | Community | No |
| `/events` | Events | No |
| `/blog` | Blog | No |
| `/learn` | Learn | No |
| `/release/:id` | ReleaseDetail | No |
| `/beat/:id` | BeatDetail | No |
| `/store` | Store | No |
| `/creator/:username` | CreatorProfile | No |
| `/terms` | Terms | No |
| `/privacy` | Privacy | No |

### Protected Routes (Auth Required)

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard` | Dashboard | User dashboard |
| `/library` | Library | User library |
| `/favorites` | Favorites | Saved content |
| `/studio/*` | CreatorStudio | Creator workspace |
| `/settings/*` | Settings | User settings |
| `/inbox` | Inbox | Messages |
| `/wallet` | Wallet | Credits & balance |
| `/collaborate` | Collaborate | Collabs |
| `/admin/*` | Admin | Admin panel |

### Embed Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/embed/beat/:id` | EmbedBeat | Embeddable beat player |
| `/embed/release/:slug` | EmbedRelease | Embeddable release player |

---

## Feature Flags

**Location:** `src/config/featureFlags.ts`

| Flag | Status | Description |
|------|--------|-------------|
| LMS | ✅ Enabled | Learning Management System |
| LIVE | ✅ Enabled | Live sessions |
| BATTLES | ✅ Enabled | Battle feature |
| COMING_SOON_MODE | ⚠️ Conditional | Production landing page |

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Pages | 125+ |
| Components | 440+ |
| Edge Functions | 134 |
| Database Tables | 100+ |
| API Endpoints | 50+ |
| Integrations | 10+ |

---

## Quick Links

- **Homepage:** `/`
- **Fan Home:** `/home`
- **Marketplace:** `/marketplace`
- **Creator Studio:** `/studio`
- **Live Platform:** `/live`
- **Academy:** `/learn`
- **Community:** `/community`
- **Admin:** `/admin`

---

*This document provides a complete overview of the Pluggd platform architecture, features, and capabilities.*


# Pluggd Complete Testing Manual

> **Estimated Time:** 6-8 hours for full coverage  
> **Date:** December 1, 2025

---

## How to Use This Document

1. Work through each section in order
2. Check off each step as you complete it
3. Note any bugs in the Issues section at the end
4. Take breaks - this is comprehensive!

---

## PART 1: ENVIRONMENT & PUBLIC PAGES

### 1.1 Start Development Server
```bash
cd /Users/apple/PLUGGD_NEW && npm run dev
```
- [ ] Server starts without errors
- [ ] Open http://localhost:5173
- [ ] DevTools Console is clean (no red errors)

### 1.2 Homepage `/`
- [ ] Hero section: "Your Music. Your Rules."
- [ ] Stats cards animate in
- [ ] "Why Pluggd Exists" section visible
- [ ] Feature grid displays all features
- [ ] Testimonials section shows
- [ ] Footer links work

**Test clicks:**
- [ ] "Claim Your Free Creator Page" → Signup
- [ ] "Explore Releases" → /releases
- [ ] "Browse Beats" → /marketplace

### 1.3 Releases `/releases`
- [ ] Hero with "Discover New Music"
- [ ] Search bar filters results
- [ ] Genre dropdown works
- [ ] Grid/List toggle works
- [ ] Click release → Detail page
- [ ] Click play → Audio starts

### 1.4 Marketplace `/marketplace`
- [ ] Hero with "Find Your Perfect Sound"
- [ ] Search filters beats
- [ ] BPM filter works
- [ ] Price filter works
- [ ] Click beat → Plays audio

### 1.5 Community `/community`
- [ ] Hero with "The Community Hub"
- [ ] All tabs work (Fan Map, Contests, Collabs, Live, Learn, Radio)
- [ ] Quick actions sidebar visible

### 1.6 Other Public Pages
- [ ] `/learn` - Course catalog loads
- [ ] `/help` - FAQs display
- [ ] `/charts` - Chart data shows
- [ ] `/store` - Products display

---

## PART 2: AUTHENTICATION

### 2.1 Sign Up `/signup`
- [ ] Form displays properly
- [ ] Enter email + strong password
- [ ] Click Sign Up → Success
- [ ] Validation works (weak password shows error)

### 2.2 Sign In `/login`
- [ ] Enter credentials
- [ ] Click Sign In → Redirects to dashboard
- [ ] Wrong password → Error message

### 2.3 Sign Out
- [ ] Click profile menu
- [ ] Click Sign Out
- [ ] Redirected to homepage
- [ ] Protected routes blocked

---

## PART 3: FAN EXPERIENCE

### 3.1 Global Player
**Start playback:**
- [ ] Click any play button → Micro player appears
- [ ] Track info shows (title, artist)
- [ ] Progress bar updates
- [ ] Play/Pause works
- [ ] Next/Previous works

**Expanded player:**
- [ ] Click expand arrow → Full player opens
- [ ] Artwork displays large
- [ ] Volume slider works
- [ ] Progress bar scrubbable
- [ ] Shuffle button toggles
- [ ] Repeat cycles: off → all → one

**Queue tab:**
- [ ] Queue list shows tracks
- [ ] Can reorder by drag
- [ ] Can remove tracks

**BarFlow tab:**
- [ ] BarFlow interface loads
- [ ] If no project → Welcome screen
- [ ] "Create New Song" button works

**Settings tab:**
- [ ] Quality selector works
- [ ] Crossfade toggle works
- [ ] Gapless toggle works

### 3.2 BarFlow Deep Test
**Create song:**
- [ ] Click "Create New Song"
- [ ] Enter name, select template
- [ ] Upload beat OR select from marketplace
- [ ] Click Create → Editor opens

**Lyrics editor:**
- [ ] Can type lyrics
- [ ] Word count updates
- [ ] Auto-save works

**Beat player:**
- [ ] Play/Pause works
- [ ] Loop sliders work
- [ ] Volume works

**Voice recording:**
- [ ] Click Record → Permission prompt
- [ ] Recording timer shows
- [ ] Stop → Transcription appears (or error)
- [ ] Insert button adds to lyrics

**AI assistant:**
- [ ] Select prompt type
- [ ] Enter prompt
- [ ] Generate → Text appears (or error)
- [ ] Insert works

**Tools:**
- [ ] Chord helper shows keys/chords
- [ ] Rhyme finder returns rhymes
- [ ] Metronome plays clicks

**Save/Load:**
- [ ] Save → Success toast
- [ ] Reload → Project persists
- [ ] Recent projects list works

### 3.3 Purchasing
**Buy a beat:**
- [ ] Find beat with price
- [ ] Click Buy → Checkout opens
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Complete → Success
- [ ] Beat appears in library

**Buy a release:**
- [ ] Same flow as beat
- [ ] Success → In library

### 3.4 Following Creators
- [ ] Visit `/creator/[username]`
- [ ] Click Follow → Button changes
- [ ] Check Following tab → Creator appears
- [ ] Click again → Unfollows

### 3.5 Memberships
- [ ] View creator membership tiers
- [ ] Click Subscribe → Payment modal
- [ ] Complete → Member status active

### 3.6 Live Sessions
- [ ] Browse `/community` → Live tab
- [ ] See upcoming/live sessions
- [ ] Join (if active) → Video loads

### 3.7 Courses
- [ ] Browse `/learn`
- [ ] Click course → Detail page
- [ ] Enroll (free) or purchase
- [ ] Open lesson → Content loads
- [ ] Mark complete → Progress updates

---

## PART 4: CREATOR EXPERIENCE

### 4.1 Creator Studio `/studio`
- [ ] Dashboard loads
- [ ] Earnings widget shows
- [ ] Sidebar navigation works

### 4.2 Upload Release
- [ ] Catalog → Releases → New
- [ ] Fill: Title, artist, cover, genre
- [ ] Upload audio file
- [ ] Set price
- [ ] Publish → Success
- [ ] Verify on `/releases`

### 4.3 Upload Beat
- [ ] Catalog → Beats → New
- [ ] Fill: Title, BPM, key, genre
- [ ] Upload audio
- [ ] Set license prices
- [ ] Publish → Success
- [ ] Verify on `/marketplace`

### 4.4 Schedule Release
- [ ] Create release
- [ ] Set future date
- [ ] Save → "Scheduled" status
- [ ] NOT visible publicly yet

### 4.5 Store Products
- [ ] Store → Add Product
- [ ] Create merchandise item
- [ ] Create sample pack
- [ ] Create bundle
- [ ] All appear in store

### 4.6 Membership Tiers
- [ ] Memberships → Create Tier
- [ ] Name, price, benefits
- [ ] Save → Tier visible on profile

### 4.7 Live Sessions
- [ ] Live → Schedule
- [ ] Set title, date, price
- [ ] Save → Appears in schedule
- [ ] Go live → Stream starts

### 4.8 Courses (Creator)
- [ ] Courses → Create
- [ ] Add lessons
- [ ] Set price
- [ ] Publish → On `/learn`

### 4.9 Analytics
- [ ] View plays chart
- [ ] View sales chart
- [ ] Date range works

### 4.10 Payouts
- [ ] Settings → Payouts
- [ ] Connect Stripe
- [ ] View earnings
- [ ] Request payout

---

## PART 5: MOBILE & RESPONSIVE

### 5.1 Mobile Test (DevTools)
- [ ] Toggle device toolbar (Cmd+Shift+M)
- [ ] Select iPhone 12 Pro
- [ ] Homepage layout correct
- [ ] Navigation hamburger works
- [ ] Player usable on mobile
- [ ] Forms work

### 5.2 Tablet
- [ ] Select iPad
- [ ] Layout adjusts

---

## PART 6: PERFORMANCE & ERRORS

### 6.1 Console Check
- [ ] Open DevTools Console
- [ ] Navigate through app
- [ ] Note any red errors

### 6.2 Lighthouse Audit
- [ ] Run Lighthouse
- [ ] Performance: ___
- [ ] Accessibility: ___
- [ ] SEO: ___

---

## PART 7: EDGE CASES

- [ ] New user empty states correct
- [ ] Search with no results handled
- [ ] Offline behavior (disconnect network)
- [ ] Invalid URLs → 404 page
- [ ] Very long text in forms handled

---

## TEST CREDENTIALS

**Stripe Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

---

## ISSUES FOUND

| # | Page | Description | Severity |
|---|------|-------------|----------|
| 1 |      |             |          |
| 2 |      |             |          |
| 3 |      |             |          |
| 4 |      |             |          |
| 5 |      |             |          |

---

## SIGN-OFF

- [ ] All sections tested
- [ ] Critical bugs fixed
- [ ] Ready for deployment

**Date:** _______________

---

*Good luck! 🚀*


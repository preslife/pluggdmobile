# Pluggd Solo Testing Guide

**For: Single Developer/Founder Testing**
**Time Required: ~4-6 hours total (can be split across days)**

---

## Before You Start

### Setup Checklist
- [ ] Run `npm install` to ensure dependencies are up to date
- [ ] Run `npm run build` - should complete without errors
- [ ] Run `npm run dev` to start local server (http://localhost:8080)
- [ ] Have a test email ready (not your main account)
- [ ] Have Stripe test mode credentials ready
- [ ] Open browser DevTools console (F12 or Cmd+Option+I)

### Test Accounts Needed
1. **Test Fan Account** - A regular user who buys/listens
2. **Test Creator Account** - A creator who uploads/sells
3. **Admin Account** (if you have one)

---

## PART 1: Authentication (30 mins)

### 1.1 Sign Up Flow
```
URL: /auth
```
- [ ] Click "Sign Up" 
- [ ] Enter test email and password
- [ ] Submit - should show success message
- [ ] Check email for verification link
- [ ] Click verification link - should redirect to onboarding
- [ ] Complete onboarding quiz (select "Creator")
- [ ] Verify you land on dashboard

**Pass if:** Account created, email verified, onboarding complete

### 1.2 Sign In Flow
- [ ] Sign out (if logged in)
- [ ] Go to /auth
- [ ] Enter credentials
- [ ] Click Sign In
- [ ] Verify redirect to dashboard
- [ ] Refresh page - should stay logged in

**Pass if:** Can sign in and session persists

### 1.3 Password Reset
- [ ] Sign out
- [ ] Click "Forgot Password"
- [ ] Enter email
- [ ] Check email for reset link
- [ ] Click link, set new password
- [ ] Sign in with new password

**Pass if:** Password reset works end-to-end

---

## PART 2: Public Pages (45 mins)

### 2.1 Homepage
```
URL: /
```
- [ ] Hero section loads with correct copy
- [ ] Stats cards display (Creators, Paid this month, Credits)
- [ ] Feature sections visible
- [ ] Footer links all work
- [ ] Mobile: Resize browser to 375px width, check layout

**Pass if:** All sections render, links work, mobile looks good

### 2.2 Marketplace (Beats)
```
URL: /marketplace
```
- [ ] Page loads with beat cards
- [ ] Search: Type a genre, press Enter - results filter
- [ ] Filter by Genre dropdown - works
- [ ] Filter by BPM - works
- [ ] Click a beat card - plays preview in global player
- [ ] Click another beat - switches playback
- [ ] Mobile: Check filters are accessible

**Pass if:** Browse, search, filter, and play all work

### 2.3 Releases Page
```
URL: /releases
```
- [ ] Page loads with release cards
- [ ] Search works
- [ ] Genre filter works
- [ ] Click release - plays in global player
- [ ] Featured section displays (if content exists)

**Pass if:** Browse and play releases work

### 2.4 Community Page
```
URL: /community
```
- [ ] Page loads
- [ ] Tabs switch content (Contests, Collabs, etc.)
- [ ] Quick stats visible in sidebar
- [ ] Command bar (⌘K or Ctrl+K) opens

**Pass if:** All tabs work, command bar opens

### 2.5 Learn Page (Academy)
```
URL: /learn
```
- [ ] Course catalog loads
- [ ] Filter by difficulty works
- [ ] Click a course - goes to detail page
- [ ] If enrolled, lessons are accessible
- [ ] Video/audio lessons play

**Pass if:** Can browse and access courses

---

## PART 3: Creator Studio (60 mins)

### 3.1 Access Studio
```
URL: /studio
```
- [ ] Dashboard loads
- [ ] Stats cards display (may be zero for new account)
- [ ] Sidebar navigation works
- [ ] Onboarding progress widget visible (if incomplete)

### 3.2 Upload a Beat
```
URL: /studio/catalog
```
- [ ] Click "Add Beat" or similar
- [ ] Fill in: Title, Genre, BPM, Key
- [ ] Upload audio file (MP3)
- [ ] Upload cover image
- [ ] Set price (e.g., £29.99)
- [ ] Click Publish
- [ ] Verify beat appears in your catalog
- [ ] Go to /marketplace - verify your beat is visible

**Pass if:** Beat uploads and appears publicly

### 3.3 Upload a Release
```
URL: /studio/catalog
```
- [ ] Click "Add Release"
- [ ] Fill in: Title, Artist name, Genre
- [ ] Upload audio file
- [ ] Upload cover art
- [ ] Set price or make free
- [ ] Click Publish
- [ ] Go to /releases - verify it appears

**Pass if:** Release uploads and appears publicly

### 3.4 Schedule a Release
- [ ] Create a new release
- [ ] Instead of Publish, look for "Schedule"
- [ ] Set date to tomorrow
- [ ] Save
- [ ] Go to Release Scheduler - should show upcoming

**Pass if:** Scheduled release appears in scheduler

### 3.5 Create a Course
```
URL: /studio/courses
```
- [ ] Click "Create Course"
- [ ] Add title, description
- [ ] Add at least one lesson (text is easiest)
- [ ] Set pricing
- [ ] Publish
- [ ] Go to /learn - verify course appears

**Pass if:** Course creates and is publicly visible

### 3.6 Analytics
```
URL: /studio/analytics
```
- [ ] Page loads without errors
- [ ] Charts render (may be empty for new account)
- [ ] Date range filter works

**Pass if:** Analytics page functional

---

## PART 4: Purchase Flow (45 mins)

### 4.1 Setup: Fund Test Account
- [ ] As fan account, go to /wallet
- [ ] Click "Top Up" or add credits
- [ ] Use Stripe test card: `4242 4242 4242 4242`
- [ ] Any future expiry, any CVC
- [ ] Complete purchase
- [ ] Verify credits added to wallet

### 4.2 Buy a Beat
- [ ] As fan account, go to /marketplace
- [ ] Find a beat with a price
- [ ] Click Buy/Purchase
- [ ] Complete checkout (use credits or card)
- [ ] Verify confirmation message
- [ ] Go to /library - beat should be there

**Pass if:** Purchase completes, item in library

### 4.3 Buy a Release
- [ ] Find a release with a price
- [ ] Purchase it
- [ ] Check /library

**Pass if:** Release accessible after purchase

### 4.4 Verify Creator Received Payment
- [ ] Log in as the creator who sold the item
- [ ] Go to /studio/analytics or /studio/payouts
- [ ] Verify sale appears

**Pass if:** Sale recorded on creator side

---

## PART 5: Global Player (30 mins)

### 5.1 Basic Playback
- [ ] Play any track
- [ ] Mini player appears at bottom
- [ ] Play/Pause button works
- [ ] Next/Previous buttons work
- [ ] Progress bar shows time

### 5.2 Expanded Player
- [ ] Click expand button (chevron up)
- [ ] Full player opens
- [ ] Artwork displays
- [ ] Queue tab shows tracks
- [ ] Volume slider works
- [ ] Shuffle toggle works
- [ ] Repeat toggle works

### 5.3 BarFlow Integration
- [ ] In expanded player, click "BarFlow" tab
- [ ] BarFlow interface loads
- [ ] Can type lyrics
- [ ] If beat is playing, shows beat info

### 5.4 Continue Listening
- [ ] Play a track, pause at ~50%
- [ ] Navigate away
- [ ] Go to /home or /discover
- [ ] "Continue Listening" section should show your track
- [ ] Click to resume - should pick up where you left off

**Pass if:** All player features work

---

## PART 6: Creator Profile (30 mins)

### 6.1 View Your Profile
```
URL: /creator/[your-username]
```
- [ ] Profile loads
- [ ] Avatar and name display
- [ ] Bio displays
- [ ] Tabs work (Music, Beats, Store, etc.)
- [ ] Content you uploaded appears

### 6.2 Follow/Subscribe Flow (as another user)
- [ ] Log in as fan account
- [ ] Go to creator profile
- [ ] Click Follow button
- [ ] Verify "Following" state
- [ ] Click again to Unfollow

### 6.3 Membership (if you have tiers set up)
- [ ] View membership widget on creator page
- [ ] Click Subscribe
- [ ] Complete subscription
- [ ] Verify access to member content

**Pass if:** Profile displays correctly, follow works

---

## PART 7: Live Sessions (30 mins)

### 7.1 Schedule a Session
```
URL: /studio/live
```
- [ ] Click "Schedule Session"
- [ ] Fill in title, date/time
- [ ] Set as free or ticketed
- [ ] Save
- [ ] Verify appears in upcoming

### 7.2 Start a Session (Test Mode)
- [ ] Go to a scheduled session
- [ ] Click "Go Live" or "Start"
- [ ] Camera/mic permission prompt appears
- [ ] Accept permissions
- [ ] Stream preview shows

**Note:** Full streaming test needs another user to join

**Pass if:** Can schedule and start going live

---

## PART 8: Mobile Testing (30 mins)

Use Chrome DevTools Device Mode or actual phone

### 8.1 Responsive Checks
- [ ] Homepage - readable, no horizontal scroll
- [ ] Marketplace - cards stack, filters accessible
- [ ] Player - mini player usable with thumb
- [ ] Navigation - bottom tab bar works
- [ ] Forms - inputs not too small

### 8.2 PWA Install
- [ ] On mobile Chrome, tap menu → "Add to Home Screen"
- [ ] App installs
- [ ] Open from home screen
- [ ] Works in standalone mode

**Pass if:** Mobile experience is usable

---

## PART 9: Error Handling (15 mins)

### 9.1 404 Page
- [ ] Go to /this-page-does-not-exist
- [ ] Should show styled 404 page, not blank

### 9.2 Network Errors
- [ ] Open DevTools → Network → Offline
- [ ] Try to navigate
- [ ] Should show offline message

### 9.3 Console Errors
- [ ] Browse through main pages
- [ ] Check DevTools console
- [ ] Note any red errors (yellow warnings OK)

**Pass if:** Errors handled gracefully

---

## PART 10: Final Checks (15 mins)

### 10.1 SEO
- [ ] View page source on homepage
- [ ] Check `<title>` is "Pluggd"
- [ ] Check `og:image` is Pluggd (not Lovable)
- [ ] Check no mentions of Lovable or 9x

### 10.2 Performance
- [ ] Open DevTools → Lighthouse
- [ ] Run audit on homepage
- [ ] Performance score should be 60+ (ideally 80+)

### 10.3 Security
- [ ] Check HTTPS works (when deployed)
- [ ] Try accessing /admin without admin account - should block

---

## Quick Reference: Test Cards

| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 9995 | Decline |
| 4000 0000 0000 3220 | 3D Secure |

**Expiry:** Any future date
**CVC:** Any 3 digits

---

## Issue Tracking

When you find bugs, note them here:

| # | Page | Issue | Severity | Status |
|---|------|-------|----------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

**Severity Guide:**
- 🔴 Critical - Blocks core functionality
- 🟠 High - Feature broken but workaround exists  
- 🟡 Medium - Cosmetic or minor UX issue
- 🟢 Low - Nice to fix, not urgent

---

## After Testing

1. **Save this file** with your completed checkboxes
2. **Create issues** in GitHub for any bugs found
3. **Prioritize** critical/high issues for fixing
4. **Deploy** when critical issues resolved

---

## Need Help?

- **Supabase Dashboard:** Check logs for backend errors
- **Browser Console:** JavaScript errors
- **Network Tab:** API failures (red requests)

---

*Good luck with testing! Take breaks - thorough testing is tiring.* 🎉


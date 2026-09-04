# Build 8 appearance manifest

This is the exact appearance authority for the Build 8 native route graph. It covers the three supported modes: **System**, **Editorial Light**, and **Night**. System resolves live from the device scheme; Editorial Light is the cream-paper/ink palette; Night preserves the accepted dark composition.

## Coverage rules

- Every long-form Expo route owns its surrounding canvas, status-bar-safe chrome, controls, forms, loading, empty and error states through `usePluggdTheme`.
- Thin route entries inherit appearance only from the rendered screen they delegate to. Redirect entries render no product chrome. Both are intentionally kept free of a second styling layer.
- Artwork, photography, video and map canvases may keep a dark media scrim. That exception ends at the media boundary: navigation, status, labels, forms, sheets, controls and recovery states remain semantic.
- Primary orange controls use `accentFill` with `onAccent`; orange editorial/link copy uses `accentText`; normal control outlines use `controlBorder`.
- Reusable actions and every newly repaired route control target at least 44 by 44 points. Accepted composition, content order, playback, commerce and navigation behaviour are unchanged.
- `LegacyMusicDiscoveryDiscover` is retained as unreachable recovery source. Both public Discover entries render `DiscoveryExperience`; no route imports the legacy export.

## Exact Expo route inventory

The contract test compares this block with the filesystem. A missing or stale entry fails the release source gate.

<!-- route-inventory:start -->
- `app/(tabs)/_layout.tsx`
- `app/(tabs)/backstage.tsx`
- `app/(tabs)/community.tsx`
- `app/(tabs)/create.tsx`
- `app/(tabs)/discover.tsx`
- `app/(tabs)/events.tsx`
- `app/(tabs)/explore.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/live/_layout.tsx`
- `app/(tabs)/live/index.tsx`
- `app/(tabs)/live/session.tsx`
- `app/(tabs)/market.tsx`
- `app/(tabs)/my-pluggd.tsx`
- `app/(tabs)/profile.tsx`
- `app/(tabs)/stage.tsx`
- `app/_layout.tsx`
- `app/auth/_layout.tsx`
- `app/auth/access-code.tsx`
- `app/auth/fan-setup.tsx`
- `app/auth/login.tsx`
- `app/auth/magic-link.tsx`
- `app/auth/role.tsx`
- `app/auth/signup.tsx`
- `app/backstage/[id].tsx`
- `app/badges.tsx`
- `app/beat-marketplace.tsx`
- `app/beat/[id].tsx`
- `app/carnival/index.tsx`
- `app/carnival/road-pack.tsx`
- `app/carnival/story/[slug].tsx`
- `app/commerce/basket.tsx`
- `app/commerce/checkout.tsx`
- `app/commerce/crowdfunding.tsx`
- `app/commerce/license-preview.tsx`
- `app/commerce/order.tsx`
- `app/commerce/orders.tsx`
- `app/commerce/success.tsx`
- `app/community.tsx`
- `app/community/boards/[slug].tsx`
- `app/community/events/[id].tsx`
- `app/connect/[slug].tsx`
- `app/connect/[slug]/business.tsx`
- `app/connect/[slug]/collab.tsx`
- `app/connect/[slug]/contract.tsx`
- `app/connect/[slug]/rates.tsx`
- `app/create-post.tsx`
- `app/create.tsx`
- `app/creator-mode.tsx`
- `app/creator/[username].tsx`
- `app/creator/_layout.tsx`
- `app/creator/analytics.tsx`
- `app/creator/audience.tsx`
- `app/creator/dashboard.tsx`
- `app/creator/events.tsx`
- `app/creator/licensing.tsx`
- `app/creator/memberships.tsx`
- `app/creator/onboarding.tsx`
- `app/creator/payouts.tsx`
- `app/creator/upload.tsx`
- `app/directory.tsx`
- `app/discover.tsx`
- `app/dj.tsx`
- `app/drops/index.tsx`
- `app/edit-profile.tsx`
- `app/events/[id].tsx`
- `app/events/index.tsx`
- `app/explore.tsx`
- `app/favorites.tsx`
- `app/following.tsx`
- `app/gamification/battles.tsx`
- `app/gamification/courses.tsx`
- `app/gamification/quests.tsx`
- `app/genre/[genre].tsx`
- `app/hashtag/[tag].tsx`
- `app/hubs/[slug].tsx`
- `app/hubs/index.tsx`
- `app/inbox.tsx`
- `app/index.tsx`
- `app/legal/privacy.tsx`
- `app/legal/terms.tsx`
- `app/library.tsx`
- `app/live/create.tsx`
- `app/live/feed.tsx`
- `app/live/index.tsx`
- `app/live/qa.tsx`
- `app/live/session.tsx`
- `app/maps.tsx`
- `app/market/[section].tsx`
- `app/market/index.tsx`
- `app/marketplace.tsx`
- `app/membership/[creatorId].tsx`
- `app/membership/_layout.tsx`
- `app/membership/index.tsx`
- `app/mixes/[id].tsx`
- `app/mixes/index.tsx`
- `app/music/index.tsx`
- `app/my-pluggd.tsx`
- `app/notifications.tsx`
- `app/opportunities/[id].tsx`
- `app/opportunities/index.tsx`
- `app/player.tsx`
- `app/playlists/[id].tsx`
- `app/playlists/new.tsx`
- `app/plug/[id].tsx`
- `app/plug/index.tsx`
- `app/post/[id].tsx`
- `app/pro/collab.tsx`
- `app/pro/epk.tsx`
- `app/product/[id].tsx`
- `app/profile.tsx`
- `app/purchases.tsx`
- `app/release/[id].tsx`
- `app/releases/index.tsx`
- `app/sample-pack/[id].tsx`
- `app/sample-packs/index.tsx`
- `app/search.tsx`
- `app/settings/blocked-accounts.tsx`
- `app/settings/data-export.tsx`
- `app/settings/index.tsx`
- `app/settings/privacy.tsx`
- `app/social/_layout.tsx`
- `app/social/hub.tsx`
- `app/social/inbox.tsx`
- `app/social/notifications.tsx`
- `app/soundboards/[id].tsx`
- `app/soundboards/index.tsx`
- `app/story/[id].tsx`
- `app/studio/action.tsx`
- `app/studio/analytics.tsx`
- `app/studio/apps.tsx`
- `app/studio/browser.tsx`
- `app/studio/catalog.tsx`
- `app/studio/catalog/[kind]/[id].tsx`
- `app/studio/commerce/index.tsx`
- `app/studio/connect-card.tsx`
- `app/studio/connect-card/edit.tsx`
- `app/studio/financials/index.tsx`
- `app/studio/index.tsx`
- `app/studio/more.tsx`
- `app/studio/my-pluggd.tsx`
- `app/studio/soundboards/[id].tsx`
- `app/studio/soundboards/new.tsx`
- `app/studio/splits.tsx`
- `app/studio/splits/[id].tsx`
- `app/studio/splits/new.tsx`
- `app/studio/videos/index.tsx`
- `app/swipe-beats.tsx`
- `app/ticket-scan.tsx`
- `app/tickets.tsx`
- `app/u/[username].tsx`
- `app/upload-clip.tsx`
- `app/user/[userId].tsx`
- `app/videos/[id].tsx`
- `app/wallet.tsx`
<!-- route-inventory:end -->

## Rendered authority map

| Route family | Appearance authority | Classification |
|---|---|---|
| Root, tab, auth, creator and membership layouts | `app/_layout.tsx` plus the family `_layout.tsx` | Semantic shell; the short live/social layouts are transparent navigators inheriting the root shell. |
| Home | `src/features/home/MusicDiscoveryHome.tsx` | Semantic chrome with component-level artwork cards and Live gateway scrims. |
| Discover | `src/features/discovery/DiscoveryExperience.tsx`, `DiscoveryHeader.tsx` | Semantic chrome with component-level spotlight, world, scene and media scrims. |
| Community | `src/features/community-feed/CommunityFeedScreen.tsx`, `CommunityInternalSwitcher.tsx`, `src/features/culture/MobileSocialPostCard.tsx` | Semantic feed/post chrome; attached media and the full-screen media viewer keep media scrims. |
| Events | `src/features/editorial/EventsBoardScreen.tsx`, `app/events/[id].tsx`, `components/EventsMap.native.tsx` | Semantic event chrome; event artwork and the interactive map canvas are bounded media/map regions. |
| Directory and public creator profiles | `src/features/directory/CreatorDirectoryScreen.tsx`, `src/features/profiles/PublicCreatorProfileScreen.tsx` | Semantic gallery/profile chrome with creator artwork and hero scrims. |
| Public catalogue indexes | `src/features/parity/AppWideParityScreens.tsx`, `src/features/editorial/ListeningFloorScreen.tsx`, `MixesWorldScreen.tsx`, `MarketStoreScreen.tsx`, `SoundboardsIndexScreen.tsx`, `EventsBoardScreen.tsx` | Semantic list/rail/card chrome with bounded artwork. The unused `DiscoverParityScreen` path is not an Expo destination. |
| Public detail entries | The corresponding long-form route in `app/{release,beat,product,sample-pack,playlists,plug,story,videos,mixes}/**` | Direct semantic route chrome; artwork/video remains bounded media. |
| Commerce and library | `app/commerce/**`, `src/commerce/CheckoutStatusScreen.tsx`, `app/{purchases,wallet,library,tickets}.tsx` | Semantic legal, basket, receipt, order and recovery states. |
| Live, playback and culture tools | `app/{live,player,soundboards,dj,swipe-beats,carnival}/**`, `src/features/live/live-culture-screen.tsx`, `src/screens/LiveSessionScreen.tsx`, the reachable `CreateHubScreen` path in `src/features/culture/CultureScreens.tsx` | Semantic controls and surrounding chrome; video/artwork/player artwork is bounded media. |
| Creator authoring and Studio | `app/creator/**`, `app/studio/**`, `src/features/studio/**`, including `SplitEngineScreens.tsx` | Semantic forms, menus, validation, loading and recovery states. |
| Social, search, profile, settings and utility routes | The direct route or delegated screen named by each Expo entry, including `src/features/search/search-discovery-screen.tsx` | Semantic chrome; redirects render no surface of their own. |

## Approved component-level immersive regions

These are not whole-screen exemptions:

- Home artwork-backed feature cards, Carnival feature, event artwork, rooms and Live gateway inside `MusicDiscoveryHome`.
- Discover spotlights, worlds, scenes, release/media cards and radar artwork inside `DiscoveryExperience`.
- Post attachment media, `MobileSocialMediaViewer`, story media and Community editorial/live interstitial artwork.
- Event artwork and the inner Mapbox/Apple map canvas; filter sheets, callouts, controls and back navigation remain semantic.
- Creator/profile heroes and public catalogue/detail artwork/video areas; all body chrome and commerce actions remain semantic.
- Full-player/mini-player artwork and media scrims; transport controls, queue, lyrics, close/minimise and surrounding canvas remain semantic.

## Blocking rendered matrix

Source coverage does not close visual acceptance. Before archive work, open and inspect:

- Compact and large iPhone: Home and Community in System, Editorial Light and Night.
- System mode: live device switch light to dark and dark to light without app restart.
- Saved Editorial Light: cold launch with no Night flash and the correct status-bar style.
- Compact and large: creator directory plus play-count-visible and play-count-hidden creator profiles.
- Default, XL and accessibility Dynamic Type; VoiceOver names/order; Reduce Motion; Reduce Transparency; Increase Contrast; safe areas; keyboard/form states; sheets/modals; and player/dock clearance.

Simulator screenshots are temporary evidence under `/tmp`; physical-device checks remain a separate release gate.

# Codex Build Handoff — pluggd-mobile (2026-07-21)

Everything is merged to `main`. Working dir: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile`.
State: all contracts + `tsc --noEmit` + expo-doctor 18/18 green (`npm run verify:mobile`).
Verified on expo-web only — this native build is the first device pass.

## Build steps

```bash
cd /Users/apple/pluggd-mobile-workspace/pluggd-mobile
npm ci
npx expo prebuild -p ios --clean     # REQUIRED: expo-screen-orientation plugin was added
LANG=en_US.UTF-8 npx pod-install     # LANG fix needed (Ruby unicode bug on this machine)
npx expo run:ios                      # or eas build if local disk is tight (~15GB needed)
```

- `.env` is tracked and complete (Supabase, Agora, Stripe, Mapbox public token).
- app.json: `orientation: "default"` + `expo-screen-orientation` plugin (`initialOrientation: PORTRAIT_UP`).
  The root layout locks portrait at runtime; only the mix detail (`app/mixes/[id].tsx`) and the full
  player (`app/player.tsx`) unlock rotation via `useListeningRoomOrientation()` (`src/lib/orientation.ts`).

## What to verify on device (web preview could not)

1. **Rotation**: open a mix or the player, rotate → wide listening-room layout; leaving returns to portrait.
2. **Haptics**: taps tick (selection), primary buttons + long-press thump (impact). Tune in
   `src/design/haptics.ts` if too strong/weak.
3. **Long-press quick actions**: hold a release tile (Releases), beat card (BeatPlug), or mix card
   (Mixes) → native action sheet (`src/lib/quickActions.ts`).
4. **Images**: served resized via Supabase `render/image` (width=800, quality=80) with auto-fallback in
   `src/components/PluggdImage.tsx`. Check sharpness on a 3x screen; bump `displayWidth` if soft.
5. **Events map**: Events tab → Map toggle → dark Mapbox static image with orange pins.
6. **Entrance motion**: Reanimated spring entrances on every main page masthead (`Enter` in
   `src/features/editorial/EditorialBits.tsx`); Home hero photo parallaxes on scroll.
7. **Home two-phase mount**: hero paints instantly, below-fold sections mount right after
   (250ms hard fallback in `live-music-dashboard-home.tsx`).
8. **Audio**: track-player playback from the Listening Floor deck, player screen, mini player.

## Guardrails (do not regress)

- One brand orange `#ff6600`; warm night surfaces (`#0a0806/#171310/#241d15`). Never reintroduce
  `#FF5A00/#FF5200` or the cool `#08080C/#12121A/#1F1F2E` family. Violet only exists as the
  Backstage sub-accent token.
- Design system: `src/design/editorial.ts` + `src/features/editorial/EditorialBits.tsx`
  (Instrument Serif display, JetBrains Mono labels, `EdPressable` for all new tap targets).
- The contract suite pins screen structure and App-Review-safe commerce paths. After ANY screen
  change run `npm run verify:mobile`; update contract pins only for intentional redesigns.
- Web app at `/Users/apple/PLUGGD_NEW` is reference ONLY — never modify. To view it: launch config
  `pluggd-reference-site` (port 5199), unlock the invite gate via localStorage key
  `pluggd_pre_release_unlock` (see `.claude` worktree launch.json / project memory).
- RN-web gotchas already handled — keep the patterns: Pressable fills live on inner Views; never
  nest Pressables; PluggdImage skips its fade on web.

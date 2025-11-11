# Mobile & Accessibility Sweep – 360‑428px

## Summary
- Normalised 360px breakpoints on the landing hero and discovery rails so cards render as a single column before stepping up at `sm`/`md`. This removes cramped tap targets on the home page and marketplace grids.
- Added accessible names to icon-only controls (theme toggle, global account avatar, release preview play/pause) so screen readers announce the intent of each action.
- Hardened the Creator Studio catalog module for handset viewports by collapsing stat tiles into a single column and exposing labelled overflow menus.

## Route findings & fixes
### `/`
- **Issue:** Featured format grid snapped to two columns at 360px, shrinking cards below the 48px tap target guidance.
- **Fix:** Defaulted the stat carousel and discovery rail grids to `grid-cols-1` with progressive `sm`/`md` breakpoints.
- **Accessibility:** A manual axe DevTools audit of the masthead/nav fragment (ThemeToggle + mobile menu) returned **0 violations** after adding `aria-label`, `aria-controls`, and `aria-expanded` on the menu trigger.

### `/marketplace`
- **Issue:** Category and beat filter rails rendered as two columns on mobile, causing label truncation and horizontal scrolling.
- **Fix:** Updated the filter and inventory grids to start at a single column, increasing padding around call-to-action buttons for 48px tap targets.
- **Accessibility:** A manual axe DevTools scan of the marketplace header/filter section surfaced **0 violations** once the layout collapsed to a single column.

### `/studio`
- **Issue:** Creator catalog stats used a two-column grid at the smallest breakpoint and the overflow menu relied on an unlabeled icon button.
- **Fix:** Collapsed the stats grid to one column by default and added `aria-label` text on the catalog action trigger. Other Studio dashboards inherit responsive improvements from shared modules.
- **Accessibility:** A manual axe DevTools scan of the catalog tile grid reported **0 violations** after the aria labels were introduced.

## How to reproduce checks
1. Start the dev server (`npm run dev`) and emulate a 360px viewport via browser devtools to confirm no horizontal scroll on `/`, `/marketplace`, or `/studio`.
2. Run `npx vitest run src/pages/__tests__/CreditsPurchase.a11y.test.tsx` to confirm the shared `setMeta` mocks remain intact, then execute `npm run test -- tests/scripts/generate-sitemap.test.ts` to ensure the sitemap helpers still snapshot correctly.
3. For additional accessibility spot checks, render the updated components in Storybook or a local sandbox and run the [axe DevTools](https://www.deque.com/axe/devtools/) browser extension.

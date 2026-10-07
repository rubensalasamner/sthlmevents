# UX review & improvement plan (2026-10-06)

Review of the app's current UX (Home, Explore, Agenda, Saved, Event detail,
filter sheet, interests prompt). Findings verified against commit `34bf338`.

**Progress (2026-10-07):** All **P1**, **P2**, and **P3** done.
- P3.19 `FilteredEventsProvider` (one pipeline + GPS)
- P3.20 map split + `Toggle`/`CategoryPill`; `FavoriteReminders` subscriber
- P3.21 dropped half-used `EventPresentation` dispatcher (direct imports)
- P3.22 dead components/types cleaned (`src/types/filters.ts`)

Priority: **P1** = user-visible bug / broken flow, **P2** = friction,
**P3** = cleanup / structure.

---

## P1 — Bugs and broken flows

### 1. "Weekend" label doesn't match the filter, and Thu/Fri hide tonight
- The filter sheet's card says `Weekend — Thu → Sun` (`src/components/filter-sheet.tsx`, `DATE_CARDS`).
- The actual window is **Sat 00:00 → Mon 00:00** (`windowFor('weekend')` in `src/utils/date-range.ts`).
- `defaultDateRange` opens Home on `weekend` from **Thursday**. On a Thursday or
  Friday, Home therefore shows nothing that starts tonight. Single Friday-evening
  events only appear if they run past midnight (as "secondary").
- No test covers the weekend window itself.

**Plan:**
- Weekend window = **Fri 00:00 → Mon 00:00** (Stockholm). On Fri/Sat/Sun, start the window at today's midnight so days that are already over don't come back.
- Default: **Fri–Sun → `weekend`, Mon–Thu → `today`**. Both windows then always include tonight.
- Add `dateRangeHint(range)` next to `dateRangeHeading` in `date-range.ts` and have the sheet read from it, so the copy can't drift from the logic again.
- Tests: weekend window for Mon/Thu/Sat/Sun, plus a Friday-night gig counted as primary. Update the `defaultDateRange` tests (Thu becomes `today`).
- Log the decision in `PROJECT_LOG.md` §4, since it changes the "helg-default torsdag–söndag" decision.

### 2. Saved shows a time with no date
- `src/app/(tabs)/saved.tsx` groups saved events into This week / Later / Past.
- `CompactRow` only shows a clock time (`19:00`) in its gutter. In "Later", a user can't tell which day an event is on.

**Plan:** build Saved's upcoming sections with the existing `groupAgenda(upcoming, now)` (Happening now / today by hour / Tomorrow / dated days / Still on). Keep a separate **Past** section, newest first. This reuses the agenda util and removes the hand-rolled `weekEnd` bucketing.

### 3. Interests prompt collides with the notification permission dialog
- On the first favourite, `FavoriteButton` calls `recordFavoriteAdd()`. Then `InterestsProvider`'s effect (`src/context/interests-context.tsx`) sets `editorOpen` straight away.
- The same tap goes through `toggleFavorite` → `scheduleRemindersForEvent` → `ensureReminderPermissions()`, which opens the **OS notification permission dialog** (`src/notifications/reminders.ts`). Result: two prompts at once on the user's first save.
- The other trigger (3 event opens) opens the sheet **on top of the event detail screen** the user just navigated to.

**Plan:** remove the auto-open `useEffect` from the provider and expose `maybePrompt()` instead (same once-per-session guard). Call it from Home via `useFocusEffect` (documented in Expo Router v57). The prompt then appears when the user comes back to Home, after any OS dialog is gone.

### 4. Filter sheet hides the screen behind it
- `FilterSheet` uses `<Modal>` **without `transparent`**. React Native's `Modal.d.ts`: `backdropColor` "Defaults to `white` if not provided and transparent is `false`". The `rgba(6,10,16,0.72)` scrim is drawn over an opaque background, so the user loses sight of the screen they're filtering.
- `InterestsPrompt` uses `transparent` correctly. The two sheets duplicate the same Modal + scrim + sheet + handle code.

**Plan:** extract a reusable `src/components/bottom-sheet.tsx` (`transparent`, `statusBarTranslucent`, `navigationBarTranslucent`, tappable scrim, safe-area bottom padding) and build both sheets on it.
- Both sheets draw a drag handle but neither can be dragged. Either remove the handle, or add swipe-to-dismiss with gesture-handler + reanimated (both installed) as a follow-up.
- Also: replace `Dimensions.get('window')` with `useWindowDimensions()`.
- When `resultCount === 0`, the CTA should say e.g. "No matches — adjust filters" instead of "Show 0 events".

### 5. "See all" and agenda search leak filters into Home and Explore
- `onRailSeeAll` in `src/app/(tabs)/index.tsx` calls the **global** `setCategory(...)` and then pushes `/agenda`. After going back, Home's hero and rails, and the Explore map, stay filtered to that category.
- The agenda search writes to the global `query` in `FiltersContext`. Back on Home, the magazine is still filtered by the search text.
- Inconsistency: `isActive` ignores `query`, but `reset()` clears it. So the sheet's "Reset" link is hidden when only a search is active.

**Plan:** pass the category as a route param (`/agenda?category=nightlife`). Add a `useAgendaScope` hook in `agenda.tsx` that:
- applies the category on mount;
- on unmount, clears `query` and restores the previous category, but only if the user hasn't changed it in the meantime.

### 6. Explore shows nothing when loading fails or nothing matches
- `src/app/(tabs)/map.tsx` passes `loading`, `error` and `onRetry` to `EventMap`. The native map ignores them (its doc comment says "unused natively"). A failed load and a "0 events match" result both look like an empty map with no explanation.

**Plan:** add a status pill under the filter chip in `map.tsx`:
- "Loading events…" while loading;
- "Couldn't load events · Retry" on error;
- "No events on the map for these filters · Reset" when nothing is mappable.

### 7. The map rebuilds itself when location arrives
- `EventMap` renders `<NativeEventMap key={userLocation ? 'near' : 'city'} />`. When GPS resolves, the whole map remounts: the camera jumps, the selected peek is lost, and every pin icon is regenerated.

**Plan:** drop the `key` and move the camera with `mapRef.current?.setCameraPosition(...)` in an effect, the same way `focusPoint` already works. Also remove the duplicate `mappableEvents()` call: it runs in both `map.tsx` and `NativeEventMap`.

### 8. Event detail can strand users who arrive from a deep link
- Share links point to `/event/<id>` (PROJECT_LOG §2). The custom back button calls `router.back()` unconditionally. On a cold deep link there's no history, so the button does nothing.
- The error state ("This event could not be found.") offers no way out.
- In the loading state the native header shows ("Event") and then gets hidden, so the layout jumps.

**Plan:** use `router.canGoBack() ? router.back() : router.replace('/')`. Set `headerShown: false` for `event/[id]` in the root `Stack` and use the same custom back button in the loading and error states. Add a "Browse events" action to the error state.

---

## P2 — Friction

9. **Two clear buttons on iOS search.** `SearchBar` sets `clearButtonMode="while-editing"` (the native iOS X) and also renders its own X. Remove `clearButtonMode`.
10. **Search icon doesn't focus search.** Home's magnifying glass opens the agenda, but the keyboard doesn't come up. Push `/agenda?focus=search` and pass `autoFocus` to `SearchBar`. Placeholder "What are you looking for?" → "Search events, venues, organizers". This matches the fields `searchEvents` actually searches: title, organizer, venue, district.
11. **The Home date can't be changed from Home.** The heading ("This weekend") is the date window, but tapping it only counts a hidden 5-tap dev gesture. In production it still dims on press and does nothing. Make the heading (plus a chevron) open the filter sheet.
12. **The dev unlock in the sheet can't be reached.** `FilterSheet` wraps `<SourceFilter>` in a long-press `Pressable`, but `SourceFilter` returns `null` while locked. The pressable has zero size. Move the long-press to the sheet's "Filters" title, then remove the 5-tap egg and the duplicate `SourceFilter` row from Home.
13. **"NOW" label goes stale.** `CompactRow` uses a module-level `const LIST_NOW = new Date()`, frozen at import. In a session that stays open (backgrounded for hours), "NOW" and the time labels are wrong. Compute it per render, or pass `now` down.
14. **Vague CTA labels.** `ticketCtaLabel` returns `Open` (free events) and `Organizer` (account required). Proposed: `Event page` and `RSVP`. Update `format.test.ts`.
15. **Agenda shows loading and empty states together.** Agenda/Saved can show "Loading…" and "No events match your filters." at the same time. Add a `loading` prop to `EventSectionList` that suppresses `ListEmptyComponent` until the first load settles. Use a spinner instead of the "Loading…" text.
16. **Unhelpful message when location is denied.** "Location denied" gives no next step. Use "Location denied — enable it in Settings". Optionally add a button using `Linking.openSettings()`.
17. **No context before the notification permission prompt.** It fires cold on the first favourite. Consider a one-line pre-prompt ("Get a reminder the day before?") before calling the OS dialog. Optional; depends on item 3.
18. **Spacing inconsistency.** The Saved header uses `paddingHorizontal: Spacing.two` inside a list with `Spacing.three` content padding. Home and Agenda use the effective `Spacing.four`. Align Saved with Agenda (`marginHorizontal: -Spacing.three` + `Spacing.four`).

---

## P3 — Structure, performance, dead code

### 19. `useFilteredEvents` runs three times and starts three GPS requests
`useFilteredEvents` is a plain hook used by Home, Explore and Agenda. The tabs stay mounted, so every filter change re-runs search → date split → `collapseSeries` → `orderFeed` over ~5k events **once per mounted screen**. Each instance also:
- calls `useEvents()` (its own load), and
- calls `useUserLocation(nearMe)`. Toggling Near me fires one permission/GPS request per mounted surface, each with its own cache.

It also computes `featured` and `isDefaultView`, which **no screen reads**.

**Plan:** turn it into `FilteredEventsProvider` (`src/context/filtered-events-context.tsx`), mounted inside `FiltersProvider` in `_layout.tsx`, with `useFilteredEvents()` reading from the context. That gives one pipeline and one GPS fix. Delete `featured`, `isDefaultView` and `featuredEvents()` in `ranking.ts` (now unused). Pass `now` into `splitByDateRange`; today it defaults to a fresh `new Date()` while `orderFeed` uses the memoised `now`.

### 20. Single-responsibility violations
- **`event-map.tsx` (409 lines)** mixes availability gates, selection state, camera state, bubble sizing, async PNG icon generation, and platform-specific rendering. Split it into `map-availability.ts` (gates + `MapUnavailable`), `use-map-camera.ts`, `use-pin-icons.ts`, and a thin `NativeEventMap`. The Apple/Google branch is a natural **strategy** (`{ ios: AppleMapRenderer, android: GoogleMapRenderer }`) instead of an inline ternary with two marker-shape `useMemo`s.
- **`FilterSheet`** owns its sheet chrome, date cards, chips, a hand-built toggle, and dev-source unlocking. After item 4, extract `ChoiceChip` (it duplicates `CategoryPill`, so merge them) and a reusable `Toggle`.
- **`FavoritesProvider.toggleFavorite`** handles state, persistence, and reminder scheduling (which can trigger an OS permission dialog). Move scheduling into a subscriber, e.g. a `useFavoriteReminders()` effect next to `NotificationBootstrap`. The provider then only owns favourites.

### 21. The `EventPresentation` strategy is mostly bypassed
`EventPresentation` is a strategy dispatcher, but only Home's hero uses it. `MagazineRailRow` imports `PosterTile` directly, and `EventSectionList` imports `CompactRow` directly. Either route all surfaces through it, or delete it and keep the direct imports. Half-adopting it adds indirection without the benefit. Its prop bag (`width` only for poster, `selected/onPress` only for compact) suggests per-variant props, i.e. a discriminated union.

### 22. Dead code to delete (0 imports in `src/`)
- Components: `collapsible` (`components/ui/`), `date-filter`, `segmented-control` (only used by `date-filter`), `filter-summary-chip`, `hint-row`, `screen-header`, `source-tag`, `web-badge`.
- `category-filter.tsx` and `near-me-filter.tsx`: only their **types** are imported (`CategoryFilterValue`, `NearRadiusKm`). Move the types to `src/types/filters.ts` and delete the components.
- `date-range.ts`: `DATE_RANGE_LABELS` (Swedish labels in an English UI; only used by `date-filter`), `dateRangeSubtitle`, `filterByDateRange` (only used by its own test).
- `ranking.ts`: `featuredEvents` (see item 19).

---

## Suggested order

1. **P1 items 1, 2, 3, 5.** Pure logic, all testable, and the biggest user impact.
2. **Item 4 (BottomSheet) + item 12.** They touch the same file.
3. **Item 19 (provider)** before items 6 and 7, so the map status pill reads from the shared pipeline.
4. **Items 6, 7, 8**, then the P2 batch.
5. **Items 20–22.** Refactor and cleanup, kept as separate commits.

Verification per step: `npm test`, `npx tsc --noEmit`, `npm run lint`. Native items (4, 6, 7, 8, 9, 17) also need a manual check on a dev build (`npm run start:usb`).

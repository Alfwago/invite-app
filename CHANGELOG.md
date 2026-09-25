# Changelog — OBH Skate Invites app

Dates are when the work was done, not released. 1.4.0 is live in the App
Store; Android ships as a direct-download APK from the site.

## 2026-09-25 — 1.5.0: skate-day lock-screen card, watch stays current, roster taps

Version 1.5.0 (iOS build 22). Needs `invite-server` 0.29.0 on prod (card token
endpoints, Home's night logo + board line, the Home visibility fix). New native
code and a new widget extension, so it can't go out as an over-the-air update —
it needs a store build. Do not bump `SiteConfiguration.latest_app_version` until
1.5.0 is live in the App Store.

- **Skate-day card (iOS 16.2+)**: a Live Activity on the Lock Screen and in the
  Dynamic Island for your next skate, from 7 hours before puck drop to an hour
  after — the night's logo (Monday Mules etc., bundled; custom uploads show the
  default OBH logo), name and time, one status pill (NEED GOALIES / NEED
  SKATERS / FULL, or your own WAITLIST / MAYBE / NOT ANSWERED when you're not a
  Yes), the app's roster fill bar, "13/16 skaters · 1/2 G", your jersey once
  teams are picked ("Jersey: TBA" until then), and the newest post on the
  night's board from the last 24 hours. After puck drop it reads "Started
  9:30 PM" and drops the pill. Tapping opens the event. Goes to everyone
  invited who hasn't said No.
  - Started and kept current by the server over APNs (push-to-start needs iOS
    17.2+). Until the server has its APNs key, the card starts and refreshes
    whenever the app is opened during that window.
  - `targets/skate-card` (widget extension, night logos in its asset
    catalog), `modules/skate-card` (starts the card, reports its ActivityKit
    tokens to `/api/live-activity/register/` natively so a background wake can
    do it), `src/hooks/useSkateCard.ts` + `src/skateCard.ts`.
  - Android's pinned-notification version isn't in this release.
- **Watch stays current without opening it**: the watch now fetches
  `/api/home/` from the server itself — when the watch app opens and in
  background refreshes (every ~15 min on skate day, hourly otherwise; watchOS
  decides the exact timing) — and reloads the complication each time. The
  phone hands the watch its server URL + login token in the existing
  application context and clears it on sign-out. The phone's instant push
  while its app is open is unchanged. `targets/watch/WatchSync.swift`.
- **Director roster: Present / Paid taps are instant**: the tick flips right
  away (rolled back if the save fails) and the other rows stay tappable while
  it saves. The screen no longer jumps under your finger — a background
  refresh used to show the pull-to-refresh spinner, which pushed the list
  down; the spinner now only shows for your own pull. Same spinner fix on
  Home, Events, Messages, event detail and event chat.
- **Home: Night status and Other events** only list skates you can open
  (server-side fix in 0.29.0).
- Tests: `npm test` 29 (was 17).

## 2026-09-20 — 1.4.0: watch no-skate look + sync fix, jerseys, profile locks

Version 1.4.0 (iOS build 3, Android versionCode 2). Needs `invite-server`
0.28.0 on prod for the profile-change screens, roster jerseys and the
attendance fix; the rest works against 0.27.0. Do not bump
`SiteConfiguration.latest_app_version` until 1.4.0 is live in the App Store.

- **Watch sync fix**: the phone dropped pushes made before the session/watch
  app were ready (and swallowed errors), and the watch couldn't decode the
  phone's fractional-second timestamp, so it sat on "Waiting for iPhone".
  Pushes are now retried on activation / watch-state changes, the watch
  accepts both date forms, and both sides log to `com.falcon83.obhinvites`.
- **No-skate look**: gold hockey-figure icon and "No OBH Skate Scheduled" on
  the watch app and every complication size (circular "No OBH / skate",
  rectangular "No OBH Skate / Scheduled", inline, corner).
- **iOS + watch test workflow**: `npm run ios:test` builds the phone app,
  watch app and complication (Release, embedded JS, no Metro) and runs both
  in paired simulators via xcodebuild/simctl; `--archive-check` guards the
  submission (test-server URL from `.env.local`, version/build drift, watch
  device family). See `.claude/skills/ios-watch-test/SKILL.md`.

### Earlier in this release


- **Watch complication, no-skate state**: with nothing scheduled it used to
  show an empty roster ring (reads as "0% full") behind a generic calendar.
  It now shows a hockey figure (`figure.hockey`) in a muted tone on every
  family: circular "No skate", rectangular "No Skate / Nothing scheduled",
  inline "No skate scheduled", corner icon + label. The watch app's own
  `NoSkateView` gets the same icon.
- **Stale skate guard**: the complication now treats a skate whose date has
  passed as "no skate" (`WatchDateFormatting.isPast`) and, while a skate is
  showing, reloads itself at the next local midnight so it flips without the
  phone having to push anything. NOT compiled or run yet: written on the Pi
  (no Swift toolchain), so build it in Xcode first. Steps: `WATCH_SIMULATOR.md`.
- **Roster jersey icons**: the event roster (player view and director manage
  rows) shows a Gold/Black shirt icon per player once teams are published,
  from the new `team` field on `/api/events/<id>/` roster entries.
- **Approval-gated profile changes**: name and username are locked on My
  Profile (greyed out, "Request … change" unlocks the field, Save files a
  request for the approving director); directors decide on the Approvals
  screen. `PATCH /api/me/` no longer accepts first_name/last_name.
- **Select all present/paid** toggle on the director's roster.
- Paired with `invite-server` migrations 0083/0084 and the server changes for
  the attendance %, team field and name/username requests.

## 2026-09-15 (later) — Team Generator sync/balance fixes, signup

Paired with `invite-server` `0.27.0` (server released and live on prod).
Version bumped to 1.3.0 (`app.json`) — `eas.json` has `appVersionSource:
"remote"` and `autoIncrement: true` on the production build profile, so EAS
manages the actual build number at `eas build` time; this bump is just for
the version string itself.

- **Team Generator "Refresh" now actually refreshes the lock state**: it
  used to only re-fetch the roster, so a team lock/publish made on the
  website (or another device) while the screen was open never showed up
  until you left and came back. It now re-fetches both and re-applies a
  locked draft if the server reports one — local edits are left alone if
  the server isn't locked.
- **Pair/split balance fix**, matching the server: when a "keep apart"
  fix-up had no safe player to swap back, it used to move the player anyway
  and leave one team a player heavier. It now leaves that split unresolved
  instead. Same fix, same reasoning, as the website's Team Generator — see
  `src/teams/balance.ts`.
- **Signup screen** (`app/signup.tsx`), reachable from "New here? Create an
  account" on the login screen — mirrors the website's signup form
  field-for-field (director picker, phone, self skill assessment) against
  the new `POST /api/auth/signup/` / `GET /api/auth/signup/directors/`.
  Doesn't sign the new account in — matches the website, where a pending
  account can't do anything until it's both verified and director-approved.
- **Fixed a real bug in `version.ts`** (added last session, never actually
  exercised until today — see below): `compareVersions("", "1.2.0")`
  returned `-1` instead of `0`, because `Number("")` is `0` in JavaScript,
  not `NaN`, so the "unparseable input" guard missed an empty segment.
  Doesn't affect the Update banner in practice (`isNewerVersion` already
  short-circuits on blank input before calling this), but the function's
  own contract was wrong.
- Found the sandbox's Node version (20.19) can't run this project's own
  `npm test` (`node --test --experimental-strip-types`) — `npx tsx --test`
  works as a drop-in substitute and is how everything here was actually
  verified (17/17 `version.test.ts`, 12/12 `balance.test.ts`). Worth
  switching the `test` script to `tsx` if this comes up again.

## 2026-09-15 — Reset jerseys, pair-name fix, update nudge

Paired with `invite-server` `0.25.0` (server released and live on prod).
Verified live against the test stack's API (login, lock, publish,
reset-jerseys, draft-event visibility); not run through a simulator/device
in this session — see PICKUP_NOTES-equivalent conversation notes.

- **Reset jerseys**: a new button next to "Push to players" in the Team
  Generator un-publishes the event's split (players stop seeing the "You're
  on Gold/Black" card) without touching the Lock Teams draft. Only shown
  once something's actually published; a confirmation explains it's silent
  to players and doesn't affect the locked teams/pairs/splits.
- **Pair/split names no longer show "(removed)"**: a `{id: name}` cache is
  captured whenever an id resolves against the live roster (pair/split
  creation, and every render) and carried through the Lock Teams snapshot,
  so a walk-on's id changing (delete + re-add) no longer orphans the chip's
  display name.
- **"Update available" banner** on Home, below Sign Out: a dismissible,
  blue-toned nudge shown when the server's `latest_app_version`
  (`SiteConfiguration`, relayed via `/api/home/`) is newer than the
  installed build. Dismissal is per-version (stored in `expo-secure-store`,
  no new dependency), so a later bump shows it again. Android's button
  opens the existing `/app` APK page; iOS has no button yet (no live store
  URL to link to).

## 2026-09-14 — watchOS: app icon, complication roster ring

- **Watch app icon**: the `watch` target had never had one — added via
  `icon:` in `expo-target.config.js`, same source as the main iOS app
  icon (`assets/icon.png`, the puck/"OBH INVITES" mark), not the
  wordmark used in the header (illegible at icon sizes). This is the
  target's icon, not the complication's — the step-4 attempt to give
  the *complication* an icon failed with "did not have any applicable
  content"; that error turned out to be specific to widget-extension
  targets (which don't use a full multi-size AppIcon set the way an
  `application`-type target like `watch` does), not a problem with the
  source image or icon config in general — confirmed by this one
  succeeding cleanly with the identical mechanism.
- **Complication ring**: the circular complication (`accessoryCircular`)
  now wraps its RSVP-icon + jersey-letter content in a `Gauge` styled
  `.accessoryCircularCapacity` — a colored ring around the edge showing
  roster fullness (skaters filled / capacity, the same number the
  phone's own FillBar and the watch app's "Skaters" bar use), toned
  the same green/amber/red as everywhere else roster health shows up.

Verified: the icon builds correctly as a proper watchOS AppIcon set
(single 1024×1024 "universal" image, confirmed in the generated
Contents.json) and the app still launches and runs normally. The ring
can't be added to a watch face in this sandbox (no touch input), so
its rendering was verified with a temporary harness in the watch
app's own ContentView — an exact copy of the complication's circular
view fed three synthetic states (38% orange, 100% green "roster
full", 0% red) — confirmed the ring fills proportionally and tints
correctly, screenshotted, then reverted (`git diff` clean on that
file before committing).

## 2026-09-14 — watchOS: RSVP refuses to submit when unreachable

Fixes the top finding from today's advisory-board review (Amy and
Logan independently found the same bug from the UX and architecture
angles — see `BoardMeetingNotes.md`): when the phone wasn't reachable
at tap time, the watch fell back to `transferUserInfo`, which has no
reply channel. A real failure (event locked, roster full, server
error) had no way back to the watch, so the optimistic tap just stood
— the watch could show a confirmed "Yes" that was never saved, with
no self-correction.

Decision (discussed with the developer): rather than making the
watch information-only, or trying to hand off to the phone app
(watchOS has no way to force-launch the phone app — Handoff only
places a tappable icon on the phone, doesn't fix reachability, and
still requires a second manual tap), keep one-tap RSVP but make it
live-only:

- `PhoneConnector.sendRsvp`: removed the `transferUserInfo` fallback
  entirely. `sendMessage` (which always replies) is now the only
  delivery path; unreachable means an immediate, honest
  "Can't reach iPhone — try again when nearby." — never silence.
- `NextSkateStore.setRsvp`: checks `isPhoneReachable` *before*
  touching anything, so an unreachable phone never shows an
  optimistic update that's about to be reverted — it just never
  happens.
- `ContentView`: surfaces `isPhoneReachable` ambiently (a small
  "iPhone not connected" line near the RSVP controls) — this was
  already tracked and published, per Amy's finding, just never shown.
  Now the user knows before tapping, not just after a failed one.
- `ExpoWatchConnectivityModule.swift` (phone side): removed the now-
  dead `didReceiveUserInfo` handler that used to receive the queued
  fallback with a discarded reply closure.

**Verified live, with one honest caveat.** Confirmed the reachable
happy path still works correctly against real data (a different live
event this time — "Tuesday Titans," roster full 20/20 skaters + 2/2
goalies, first time the "Roster full" green state was seen live).
Tried to verify the unreachable path by shutting down the phone
simulator entirely (confirmed via watchOS's own system disconnected
icon) — but `WCSession.isReachable`, read directly by the watch app
on a fresh activation, still reported `true`. This looks like a
known limitation of simulator-to-simulator WatchConnectivity (no real
Bluetooth/proximity, so "reachability" isn't faithfully modeled)
rather than a bug in this code — the guard is a straightforward
`session.isReachable` check, the same property the *old* code already
read at the same call site, just with a different (correct) else
branch now. Could not confirm the "iPhone not connected" indicator or
the tap-refusal live; that needs a real device.

## 2026-09-14 — watchOS: tighter header, RSVP badge moved down

Another live-feedback pass: pull everything up so the night name sits
closer to the system time, and move the colored RSVP status pill from
right after the header down to just above "Change RSVP".

- `NightHeaderView`: wordmark down from 26pt to 18pt tall (level with
  the time, not its own banner row), tighter internal spacing.
- `ContentView`: outer stack spacing 8 → 6, top padding 4 → -8 (a
  small negative pull, checked on-device against the actual system
  time position so it tightens up without the logo colliding with or
  going under it).
- Reordered the post-RSVP branch: roster bars → jersey → **RSVP
  status pill → Change RSVP** (previously the pill sat right under
  the header, before roster/jersey).

Verified the same way as the last two passes — real device data
("Thursday Old Fashioneds"), plus a temporary header-hide to bring
the reordered bottom section above the fold for a screenshot,
reverted before committing.

## 2026-09-14 — watchOS: wordmark header, reordered post-RSVP layout

Follow-up to the roster-status/Change-RSVP pass, requested after
seeing it live: swap the app-icon graphic for the actual header
wordmark, use the unused top-left corner (the system time owns the
top-right) instead of a small inline icon, and reorder the
post-RSVP screen to lead with the roster bars.

- `NightHeaderView`: the wordmark (`assets/brand/wordmark.png` — the
  same image `app/(tabs)/index.tsx` uses for the phone Home screen
  header, not `assets/icon.png`) now sits alone at 26pt height in the
  top-left, with the night name/date below it — previously a 22pt
  icon inline with the night name.
- `expo-target.config.js`: `images.obhLogo` source updated to match.
- Reordered the post-RSVP screen in `ContentView.swift`: status badge
  → **roster status bars** → jersey badge (only if a team's been
  assigned) → Change RSVP. Previously: badge → Change RSVP → jersey
  (always, with a "Teams not set yet" placeholder) → roster.
- `JerseyBadge` simplified to take a required (non-optional)
  assignment — the "show nothing when not available" behavior now
  lives at the call site (`if let team = skate.teamAssignment`)
  instead of a placeholder-text branch inside the view.

Verified on the simulator with the same live "Thursday Old
Fashioneds" data as before. Confirmed the reordered roster → jersey →
Change RSVP block by temporarily hiding the header/badge to bring it
above the fold for a screenshot (reverted after, `git diff` clean
before committing).

## 2026-09-14 — watchOS: roster status, "Change RSVP", OBH logo

Requested after trying the app live: once the player has RSVP'd, show
the skate's roster status (skaters/goalies filled, as bars); a
"Change RSVP" button instead of the always-open Yes/No/Maybe row once
already answered; the OBH puck logo somewhere on screen; scrolling
explicitly embraced now that there's more to show.

- `WatchRosterStats` (new shared model, `targets/_shared/
  WatchModels.swift`) mirrors the slice of `RosterStats`
  (src/api/types.ts) the watch needs: skaters, goalies, capacity,
  goalies_needed, skater/goalie spots open, is_full.
- `RosterStatusView` + `RosterFillBar`
  (`targets/watch/Views/`): a Skaters bar and a Goalies bar, toned
  green/amber/red by the *same* logic as the phone's roster tiles
  (`src/roster.ts`'s `rosterHealth`, split into its two independent
  halves and ported to Swift in `WatchDisplay.swift` — the phone
  tones Skaters and Goalies separately, not with one shared value).
  Shown once `myRsvp != .noResponse`, since it isn't specific to the
  player before that.
- `RsvpActionArea` replaces the always-visible `RsvpButtonRow` on the
  main screen: before a response, the row is immediately tappable;
  after, it collapses to "Change RSVP" (tap to reveal the row again)
  — mirrors `RsvpControls.tsx`'s locked/editing pattern on the phone.
- `NightHeaderView` now leads with the OBH puck logo (`assets/
  icon.png`, added to the watch target via `images:` in
  `expo-target.config.js`) next to the night name.
- `useWatchConnectivity.ts`: `watchPayloadFromHome` now also sends
  `rosterStats`, built the same null-key-omitting way as the rest of
  the payload (WCSession's application context doesn't accept
  NSNull).
- Loosened the tight, no-scroll-required spacing from the earlier
  layout pass — there's now more content than fits on the smallest
  watch, and that's fine; a `Divider` separates RSVP/jersey from
  roster.

**Verified live**, not just build-verified — Metro was still
connected to a real logged-in session from testing step 3, so this
landed on real data: watch received a live push for "Thursday Old
Fashioneds" (RSVP already YES, team Black) and correctly showed
"Change RSVP" instead of the picker, matching the phone's own
"GOING" / "You're on Black" state exactly. Confirmed the roster bars
against the *same* live numbers the phone showed (8/21 skaters,
amber; 1/2 goalies, red) by temporarily reordering them above the
fold for a screenshot (reverted after) — real ScrollView clipping,
not a rendering bug, is why they don't fit in a single unscrolled
screenshot otherwise. Also temporarily forced the editing state to
confirm the revealed Yes/No/Maybe row highlights the current
selection correctly (reverted after).

## 2026-09-13 — watchOS companion, step 4: complication

Not yet visually confirmed on a watch face — see note below. Builds on
steps 1–3.

- New target `targets/watch-widget/` (`OBH Invites Complication`,
  `type: "watch-widget"`) — a WidgetKit extension embedded in the
  watch app, supporting all four accessory families: circular,
  rectangular, inline, corner. Shows the RSVP status icon/color and
  jersey team letter/name; a neutral "No Skate Scheduled" state when
  there's nothing upcoming.
- `targets/_shared/WatchSharedStorage.swift`: App Group
  (`group.com.falcon83.obhinvites.watch`) UserDefaults read/write for
  the `WatchPayload` — shared between the watch app and the
  complication only (App Groups don't cross devices, so this has
  nothing to do with the phone). `NextSkateStore` now writes through
  it and calls `WidgetCenter.shared.reloadAllTimelines()` on every
  real change (a live payload, or a tap's optimistic update/rollback).
- Added `symbolName` (SF Symbol per RSVP status) and `shortWeekday`
  to the shared `WatchDisplay.swift` helpers, and moved the one
  sample/preview `WatchNextSkate` from the watch app into
  `WatchModels.swift` as `.preview` so both the watch UI's previews
  and the complication's placeholder/gallery snapshot use the same
  one.
- **A real bug caught and fixed**: the complication's default bundle
  identifier (`com.falcon83.obhinvites.watch-widget`, a sibling of the
  watch app) doesn't nest under the watch app's own bundle id
  (`com.falcon83.obhinvites.watch`) the way an embedded extension
  must — the simulator refused to install with "Mismatched bundle
  IDs" until it was set explicitly to
  `com.falcon83.obhinvites.watch.widget`.

**Verified**: all three schemes (main app, watch app, complication)
build clean; the complication installs as a properly embedded
extension (confirmed via the simulator's app-group container listing)
and the watch app itself shows no regression. Wrote a standalone
Swift check (outside the Xcode project, compiled with plain `swiftc`)
that round-trips a `WatchPayload` — including the nil-`nextSkate`
case — through the exact `WatchSharedStorage` code the app uses: pass.
**Not verified**: what the complication actually looks like pinned to
a watch face. That requires either Xcode's Canvas or manually adding
it to a face in the Simulator (long-press the face → Edit → swipe to
complications → tap a slot → "OBH Invites"), both of which need
interactive/GUI access this sandbox doesn't have — same category of
gap as steps 2's tap-gesture and 3's login round trip.

## 2026-09-13 — watchOS companion, step 3: WatchConnectivity

Not yet device-tested with a live login — see note below. Builds on
steps 1–2.

- **Watch -> phone**: an RSVP tap sends `{type: "rsvp", requestId,
  eventId, status}` to the phone over WCSession (`sendMessage` when
  reachable, `transferUserInfo` as a queued fallback otherwise).
  `targets/watch/PhoneConnector.swift` owns the watch-side WCSession.
- **Phone side**: a new local Expo Module,
  `modules/watch-connectivity/` (`ExpoWatchConnectivity`), holds the
  WCSession replyHandler open, fires `onRsvpRequest` into JS, and
  completes the reply only once JS calls back. JS
  (`src/hooks/useWatchConnectivity.ts`, wired into `app/_layout.tsx`
  alongside `useNotificationHandling`) performs the RSVP through
  `api.submitRsvp` — the same function `useRsvp` calls, not a new
  path — then replies success/failure. On success it invalidates the
  same query keys `useRsvp` does, so the phone UI updates too.
- **Phone -> watch**: whenever Home's next skate / RSVP / jersey
  changes, `useWatchConnectivity` pushes a `WatchPayload` to the watch
  via `updateApplicationContext` — delivered even if the watch app
  isn't running. The watch also reads any cached context on
  activation, so a cold launch shows real data immediately instead of
  waiting for a fresh push.
- Watch UI: taps apply optimistically, then roll back with a small
  red error line if the phone reports failure. Added a "Waiting for
  iPhone…" state, distinct from "no skate scheduled", for before the
  first payload ever arrives.

**Verified**: both the watch and main app schemes build clean
(including the new native module and its CocoaPods integration via
`pod install`); `tsc --noEmit` and the existing `npm test` suite pass.
The watch app correctly shows "Waiting for iPhone…" on a fresh
install rather than crashing. **Not verified**: the live tap ->
phone -> submitRsvp -> watch-update round trip, which needs a logged-in
session — this sandbox has no touch-simulation tool (no `idb`, no
accessibility access for UI scripting) to drive the login screen or
tap the watch's Yes/No/Maybe row, so that needs your own device test
(`npx expo start`, connect the dev client, log in, pair Watch app).

## 2026-09-13 — watchOS companion, step 2: main watch screen

Not yet functional — RSVP taps update local state only, no phone sync yet
(that's step 3). Builds on step 1's target scaffold.

- Main screen (`targets/watch/ContentView.swift` + `Views/`): night name +
  date/time, current RSVP status as the dominant color-coded element
  (green Yes / red No / amber Maybe / gray No Response — matches the
  selected-choice colors in `RsvpControls.tsx`, not the muted roster-badge
  convention), a one-tap Yes/No/Maybe row, and a jersey color badge
  ("You're on Gold — wear your gold jersey") or "Teams not set yet".
- `targets/_shared/WatchDisplay.swift`: SwiftUI color/label/date-formatting
  helpers on the step-1 shared model types, reused as-is by the
  complication in step 4.
- `targets/watch/NextSkateStore.swift`: the view model RSVP taps go
  through. Its public surface won't change in step 3 — only the body of
  `setRsvp` does, swapping the local-only update for a WatchConnectivity
  round-trip to the phone's real `submitRsvp`.
- Verified on the simulator: built both the watch and main app schemes
  clean, then ran all four RSVP colors plus the Gold/Black/no-team jersey
  states and the no-next-skate state by swapping the sample data and
  reinstalling — screenshotted each on the paired Apple Watch Series 11
  (46mm) simulator.

## 2026-09-13 — watchOS companion, step 1: target scaffold (in progress)

Not yet functional — this is the Xcode plumbing only, done first so later
steps build on a working target.

- Added a `watch` Xcode target (`OBH Invites Watch`) via the
  `@bacons/apple-targets` Expo config plugin, so `expo prebuild --clean`
  regenerates it instead of losing it. Source lives in `targets/watch/`
  (committed); the generated `ios/` project is unaffected in git, as before.
- `targets/_shared/WatchModels.swift`: Swift mirrors of `RsvpStatus`,
  `TeamAssignment`, and the next-skate slice of `EventSummary`
  (`src/api/types.ts`), linked into the main app, watch app, and (later)
  complication target via the plugin's `_shared` convention.
- Placeholder watch screen only, to prove the target builds and links the
  shared types. Verified: watch scheme builds clean, main app scheme still
  builds clean (embeds the watch app), both launch on a paired iPhone
  16e + Apple Watch Series 11 (46mm) simulator pair.
- Installed the `apple-targets` agent skill (`.agents/skills/`,
  `skills-lock.json`) — per-target Swift reference docs for the
  WatchConnectivity and WidgetKit complication work in later steps.

## 2026-09-13 — Team Generator: Lock Teams (branch work, not merged)

Paired with `invite-server` `0.24.0` (server released and live on prod;
this app work is on branch `feature/team-generator-lock`, authored on the
Pi, NOT typechecked or merged to `main` yet).

- **Lock Teams**: pins every player's current team plus the
  pairs/splits/present-only filter and saves it to the server per event —
  reopening the generator (this app or the website, either device) restores
  it instead of resetting to a fresh auto-balance. Every edit made after
  locking autosaves. Unlock releases it.
- **Push to players auto-locks the split** server-side regardless of
  whether Lock was hit first; the app now syncs its Lock button to match
  right after a successful push.

## 2026-09-11 — Messaging + roster batch, deep links, app-icon badge

Paired with `invite-server` `0.23.0` (server released; this app work is
pending its own store/EAS submission).

- **@mentions in the message board composer** — typeahead suggests board
  members after typing `@`; tagged players get a push.
- **DM reactions + edit/delete, swipe-delete inbox, message-directors
  button** — direct messages get the same tapback reactions as boards, the
  sender can edit/delete their own message, inbox rows swipe to delete, and
  a "Contact Directors" button messages a night's directors as private 1:1s.
- **Penalty box + chirps** on the player event screen — see who's boxed and
  clap back with a chirp, mirroring the website's public card.
- **Tappable links in message bubbles.**
- **Walk-on rating**: set on add, edit later (items 9/10).
- **Contact Directors** promoted to a real card with a gold button, a
  monochrome mail icon (2x larger), moved below "Manage event".
- **Universal Links / App Links**: the app now claims `invites.falcon83.com`
  `/event/*`, `/messages/*`, `/inbox/*` — invite and message emails open
  straight into the app instead of the browser.
- **App-icon badge**: the Home Screen icon now shows pending invites +
  unread messages, kept in sync with the server's own count on every push.
  Fixed along the way: `registerForPush()` was skipping the notification
  permission request entirely on any build without real push-token hardware
  (including the Simulator), so badge authorization was never granted there;
  and a badge set while permission was still `"undetermined"` (the request
  takes real time to answer) never reached the Home Screen once granted —
  the last-requested count is now replayed right after permission flips to
  granted.

## 2026-09-02 — App/Web cleanup: goalie marks, settings grid (branch work, not shipped)

Paired with `invite-server` `feature/mobile-director-roster` changes of the same
date (bold-gold "G", `is_goalie_skater` on roster/night-member API rows, and the
`beer_guy_pays` field removed server-side — migration `0078`).

- **Goalie mark is now a bold gold "G"** — Skate-group members
  (`app/night/[id]/members.tsx`) dropped the solid gold chip. On the roster the
  mark follows the slot: a Goalie & Skater added as a skater shows nothing, as a
  goalie shows "G" (`RoleTag`). Where the slot is still open — waitlist,
  skate-group membership, add / invite candidate lists — it reads "G/S".
- **Manage → Settings is a 4-across toggle-button grid** (`app/event/[id]/manage.tsx`)
  — Guests · Auto Waitlist · Beer Guy · Whiskey Guy, then a conditional
  "WG Pays", then Roster Lock / Goalie Lock and the auto-lock note. Replaces the
  switch list.
- **"Beer Guy pays" removed** — beer guy never pays; the toggle and the
  `beer_guy_pays` field/patch key are gone.
- ND / AD roster tags: no app change (already rendered from the API's
  `is_director` / `is_assistant_director`) — the web caught up to match.

## 2026-09-01 — P1 parity + director tools + UI polish (branch work, not shipped)

Server work: `invite-server` `feature/mobile-director-roster` (Pi test stack,
`~/invite-server-test`), now **~32 commits ahead of `origin/main`**, plus the
uncommitted G+S role-picker changeset from the website agent. App work: `main`,
**59 commits ahead of GitHub, still not pushed.** See `SAVESTATE.md` →
"Going to production".

**P1 director/player features**
- **Director dashboard** (`app/director.tsx`) — your nights, other events you
  manage, pending-approval alert, a Tools list. Reached from Home → Director
  tools. ("Need an event" card removed — it listed nights you don't manage.)
- **Player approval queue** (`app/approvals.tsx`, `api/approvals.py`) — approve
  sign-ups; disabled until the account has a usable password.
- **Polls** — player view & vote (`app/polls/`, `api/polls.py`); director
  authoring (`app/polls/manage.tsx`, `app/polls/new.tsx`, `api/poll_admin.py`)
  with per-choice result bars, close/reopen/delete.
- **Direct messages / inbox** (`app/inbox/`, `api/dm.py`) — person-to-person +
  an OBH-system bucket; compose is a full-screen sheet with working recipient
  search; recipients gated by `messageable_players_qs`.
- **Waitlist reorder** + roster extras in Manage → Roster (`reorder_waitlist`,
  `set_beer_guy` / `set_whiskey_guy`, guest present/paid/remove).
- **Team Generator** (`app/teams/`, `src/teams/balance.ts`) — port of the web
  `autoBalance` with unit tests; pairs/splits, event picker, saved-split
  history, PDF export. Unrated skill = 3 (never 0), matching the web.
- **Player profiles + skill ratings** (`app/players/`, `api/players.py`) —
  directory, per-night ratings edited directly (rating-request workflow dropped
  server-side too).

**Team Generator → "Push to players"** (`f565b38`, `70b9f68`;
server `de2bb9b`)
- New `POST /api/teams/events/<id>/publish/`, `TeamHistory.published_at/by`
  (migration `0077`), `team_assignment` on `/api/home/` + `/api/events/<id>/`.
- `TeamAssignmentCard` on Home (below the next skate) and the event screen —
  "You're on Gold", jersey glyph, posted time, amber "Updated" badge on a
  re-push. Push `data.type === "team_assignment"` deep-links to the event.

**Roster: Goalie & Skater prompt** (`f5804d5`; server = website agent's
changeset)
- Adding a G+S player to the roster now prompts **Goalie or Skater?** per
  player (`src/components/RolePicker.tsx`), cancel aborts the whole add;
  `POST add { roles: {id: "goalie"|"skater"} }`. Promoting a G+S waitlist row
  prompts too (`role`). No prompt on waitlist-add — matches the web.
  Candidates rows now carry `is_goalie_skater`.
- Roster tags: gold **G** (goalie), **ND** (night director), **AD** (assistant
  director — `is_assistant_director`, server `8d6fced`) on both the manage and
  player-facing rosters.

**Navigation & shell**
- **Persistent bottom bar** on every screen (`src/components/BottomBar.tsx`) —
  the native Tabs bar is hidden; a custom bar at the root drives it.
- **One flat header** for every Stack screen (`src/components/NavHeader.tsx`),
  killing iOS 26's glass bar-button capsule. Consistent "Back".
- Refresh on foreground (`focusManager` ↔ `AppState`) and on a foreground push
  (`addNotificationReceivedListener` → invalidate home / inbox / event).

**Form pickers** (`src/components/pickers.tsx`) — pure-JS calendar / time /
number dropdowns (`DateField` / `ClockField` / `NumberField` / `DateTimeField`;
`@react-native-community/datetimepicker` didn't work under Expo Go's New
Architecture). Used on new-event (date / puck drop / roster limit), event
settings, and schedule-invites. New-event now shows the **effective** preset
time/capacity, not the raw night defaults.

**Smaller UI**
- Login: "Keep me signed in" checkbox. App renamed "OBH Invites"; version/build
  footer.
- Manage tab bar: fixed 5-across, no horizontal scroll.
- Invite list: one-line rows, icon buttons (gold envelope / +2 / red ✕); batch-2
  controls hidden unless "Send in two batches" is on.
- Roster admin rows: single line, web pay rules (goalie / director / beer &
  whiskey guy exemptions), beer/wine icons instead of emoji.
- Gold text on the "Manage event" buttons.
- Native deps added (need a dev build, work in Expo Go): `react-native-svg`,
  `@react-native-community/slider`, `expo-print` / `expo-sharing` /
  `expo-file-system`.

## 2026-08-31 — website parity rollout (branch work, not shipped)

Server work is on `invite-server` branch `feature/mobile-director-roster`,
deployed to the **test** stack only. App work is on `main`. Not merged to
prod, not pushed to GitHub. Full detail in `SAVESTATE.md`.

**Expo Go boot fixes** (`e9c2408`…`7891014`)
- Pinned to **Expo SDK 54** (only Expo Go build available for the test iPhone).
- `app.json` cleanup; Expo Go-safe push code (lazy `require`, `pushSupported`).

**Restructure — director vs. player** (`180c691`…`d1fc248`)
- Split event screen into a player view (`event/[id]/index`) and a separate
  director "Manage event" screen (`event/[id]/manage`, 5 tabs).
- New-event form matches the web (night + optional puck drop + roster limit,
  pulls night defaults / presets). Create-next auto-dates to the night's
  next weekday.

**P0 parity items 1–7** (`b32d5fe`…`5a1d81d`)
1. Forgot password on the sign-in screen
2. Resend email verification (`VerifyBanner` on Home + Profile)
3. Guest RSVP (add / name guests; shown on the roster)
4. Per-event message thread — shared `src/components/chat/ChatThread.tsx`,
   also used by the boards; reactions w/ full emoji picker, edit/delete,
   email-the-group, unread badges
5. Invite-list management in Manage → Comms (send/resend, batch 2, remove)
6. League notices post & manage — president only (`app/notices.tsx`)
7. Skate-group members — director (`app/night/[id]/members.tsx`)
- Director-only screens reached from a "Director tools" section on Home.
- Profile rebuilt to match the web (all fields, metrics, inline edit, password
  reset). Message board redesigned RCS-style with night board art.
- Item 8 (iOS dev build so push works) — still blocked on Apple Developer login.

**UI cleanup batch** (`c2c3087`…`28e3955`)
- Home: Night status in a card; "Director tools" gold label outside it; Sign
  out as a button.
- Event: collapsible Roster / RSVP cards (`CollapsibleCard`); roster
  Yes/Waitlist/Maybe/No/No-reply tabs; RSVP locks after submit with a
  "Change RSVP" button.
- 12-hour times everywhere; `TimeField` free-text time entry.
- `KeyboardAwareScrollView` on the forms; `ChatThread` composer keyboard
  offset via `useHeaderHeight()`.
- "Back" header label; fixed-size message-board night tiles.

## 2026-08-27 — initial build

**Skeleton** (`81db9fa`)
- Expo SDK 53, Expo Router, React Query, TypeScript. Token auth via
  `expo-secure-store`. `src/api/` = fetch wrapper + typed endpoints.
- Screens: Login, Events list, Event detail + RSVP controls, director panel
  (edit message / send invites / send batch), create-next-event modal, Profile.

**Fixes found while getting it running**
- `react-jsx` + `ReactNode` types; dropped `React` namespace refs (`872dd2d`)
- `.npmrc` `legacy-peer-deps=true`; deps aligned to SDK 53 (`1c31dfd`, Mac)
- Login now waits for `/api/me/` to succeed before navigating in; API errors
  no longer dump raw HTML error pages (`181784e`)
- Event detail crash — leftover `useNavigation` / `useEffect` refs (`0e687ad`)

**Home + Messages tabs** (`1905f5d`)
- 4 tabs: Home · Events · Messages · Profile
- Home: league-notices banner, "your next skate" card, night-by-night list
  with need-skaters / need-goalies / full badges (`GET /api/home/`)
- Messages: board switcher (Main + your skate groups), post text or a photo
  (`expo-image-picker`), delete your own; directors delete any
- Profile: "Log out" moved into the header (always visible)
- Shared `EventCard` component

**Push notifications** (`0eb59be`, `cf84788`) — code in place, not yet testable
- `src/push.ts`: permission → Expo push token → `POST /api/push/register/`;
  unregister on logout. No-ops on simulator and in Expo Go without an EAS
  project id.
- `AuthContext` registers after login + on cold-start restore
- `app/_layout.tsx`: tapping a notification opens `/event/<eventId>`
- deps: `expo-notifications`, `expo-device`; `eas.json` build profiles stubbed
- **Remote push needs a development build** — Expo Go on SDK 53 can't get a
  token. See SAVESTATE.md for the build steps.

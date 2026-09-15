# Board Meeting Notes

No `BOARD.md` and no prior notes file existed in this repository at the time this record was
created; this file was created by the Secretary to begin the record.

---

## Meeting — 2026-09-14

**Note on this record:** The four board members (Charles, Amy, Logan, Art) reviewed the watchOS
companion app independently and reported their findings in writing rather than in a single live,
spoken session. This section was compiled by the Secretary from those four written reports. It is
not a transcript of verbal back-and-forth deliberation; it reflects each advisor's report as
submitted. Topic under review: the watchOS companion app for OBH Invites, covering all work in
`CHANGELOG.md`'s 2026-09-13/14 "watchOS companion" entries (steps 1–4 plus three live-feedback
passes).

### Pending Chairman Response

**[CHARLES] — Origin of the watchOS Companion: No Documented Requirement**
> "The first four CHANGELOG entries — the ones that create the actual surface area (3 Xcode targets, the native `ExpoWatchConnectivity` module, WatchConnectivity sync, the WidgetKit complication) — carry no 'requested by,' no 'why,' no 'for whom.'" ... "Note for the record: Claude (chairing this review) confirmed to the board that the developer DID explicitly request the watchOS companion, in detail (a full 4-point spec), verbally/in-chat at the start of the session that began this work — this request simply was never captured in the repo's own documentation (SAVESTATE.md, memory files, or a BOARD.md). Charles's finding stands as 'no repo-level paper trail,' not 'no requirement existed.'"

**Chairman response:**
_[blank for chairman to fill in]_

**[CHARLES] — Reprioritization Away From SAVESTATE.md's Documented Next Steps**
> "`SAVESTATE.md:84-93` ('RESUME HERE') lists three concrete next steps as of the last plan-of-record: device pass, then App Store/TestFlight submission. The very next CHANGELOG entry after that plan is unrelated branch work (`Team Generator: Lock Teams`, `CHANGELOG.md:237`), then, with no transition or rationale, a brand-new platform target. Nothing in the paper trail says the store-submission work was paused deliberately in favor of the watch app — it just doesn't appear again. Worth asking the chairman directly whether that reprioritization was intended."

**Chairman response:**
_[blank for chairman to fill in]_

**[CHARLES] — RSVP Status Color Convention Chosen Without Confirmation**
> "`CHANGELOG.md:200-202`: the watch's status colors deliberately 'match the selected-choice colors in `RsvpControls.tsx`, **not** the muted roster-badge convention.' The team correctly *noticed* it was choosing between two existing conventions in the app and picked one — but the changelog only records the choice, not that it was put back to the developer for a decision."

**Chairman response:**
_[blank for chairman to fill in]_

**[CHARLES] — watchOS 10.0 Minimum Target Not Checked Against Developer's Device**
> "watchOS 10.0 minimum — `targets/watch/expo-target.config.js:6-9`, justified by 'vertical-paging TabView / redesigned navigation.' A reasonable engineering rationale, but it's a product decision never checked against what device the developer actually owns."

**Chairman response:**
_[blank for chairman to fill in]_

**[CHARLES] — Sequencing Risk: Four Layers Stacked Before Device Verification**
> "the standing instruction in `feedback-item-by-item.md` is to land one item, device-test it, then move to the next. Steps 1→4 of the watch companion were all built same-day (2026-09-13) with step 3 explicitly unverified ('not yet device-tested with a live login,' `CHANGELOG.md:154`) before step 4 was built on top of it, itself also unverified. Four layers were stacked before the base was confirmed to work on a real device."

**Chairman response:**
_[blank for chairman to fill in]_

**[CHARLES] — Request for a Stated Target Before Further Layout Churn**
> "I'd ask for a stated target for the *next* watch iteration before more layout churn goes in — three cosmetic passes in two days on an app not yet confirmed to work end-to-end on a real watch is a pattern worth naming out loud."

**Chairman response:**
_[blank for chairman to fill in]_

**[AMY] — Confirmed Silent-Failure Path on Queued RSVP Submission**
> "`targets/watch/PhoneConnector.swift` lines 53–59: when the phone isn't reachable at the moment of the tap, the watch falls back to `session.transferUserInfo(message)` and the code comment says outright: 'There's no reply for this path, so the optimistic UI state stands.' ... `modules/watch-connectivity/ios/ExpoWatchConnectivityModule.swift` lines 141–147 handles the queued delivery with a no-op reply closure (`{ _ in }`), comment admits 'no way to tell the watch whether it succeeded.' ... A real, detected failure (event locked, roster full, auth expired, network blip) is silently swallowed. The watch shows 'Yes' and 'Change RSVP' — confident, done, green — and the RSVP was never actually saved. ... A player could believe they're going and find out otherwise only by opening the phone app or showing up." Recommendation: "Ask: either surface it ('queued, will sync when iPhone is nearby') or find a way to get a real reply back through the queued path."

**Chairman response:**
_[blank for chairman to fill in]_

**[AMY] — `isPhoneReachable` Tracked But Never Displayed**
> "`NextSkateStore.swift` line 17 tracks `isPhoneReachable`, updated by `PhoneConnector.swift` (lines 87, 93), but no View reads `store.isPhoneReachable` anywhere — wired up and thrown away."

**Chairman response:**
_[blank for chairman to fill in]_

**[AMY] — Rollback Can Apply to the Wrong Tap**
> "`NextSkateStore.swift` line 26, `statusBeforeTap` is a single instance property, overwritten on every `setRsvp` call (line 52), and the reply handler never checks `requestId` before invoking `onRsvpFailed`. Fat-finger No then correct to Yes before the first reply lands, and a late failure reply for the first tap can roll back to the wrong prior state, clobbering a request that actually succeeded. Fix: key the rollback to the specific `requestId`."

**Chairman response:**
_[blank for chairman to fill in]_

**[AMY] — "Change RSVP" Has No Cancel / Back-Out Path**
> "`RsvpActionArea.swift` lines 13–31: tapping 'Change RSVP' reveals the live picker; tapping any choice both selects AND submits in one motion — no staging, no Cancel. Compare the phone's own pattern this is meant to mirror (`RsvpControls.tsx` lines 198–226): explicit 'Save changes' plus a 'Cancel' that reverts without calling the API. ... there's no 'never mind' path — tapping your own already-current choice just to close the picker fires a real network round trip. Cheap fix: if tapped status == current, just close locally, skip the submit."

**Chairman response:**
_[blank for chairman to fill in]_

**[AMY] — Jarring Double Layout Jump on First RSVP**
> "`ContentView.swift` lines 20–32: a single condition branch means the moment `myRsvp` flips away from `.noResponse`, the entire roster/jersey/badge/Change-RSVP block materializes instantly, before the phone confirms anything; a rollback makes it all vanish back to the picker with only a small `.caption2` red line as explanation, easy to miss on a wrist glance below the fold."

**Chairman response:**
_[blank for chairman to fill in]_

**[AMY] — What's Working Well (for the record)**
> "empty state copy (`NoSkateView.swift`) is clear and actionable; loading vs. empty distinction (`WaitingForPhoneView` gated by `hasReceivedData`, not conflated with 'no skate') is exactly right; progressive disclosure (jersey badge only when assigned, no placeholder eating space); every RSVP state pairs color with a text label, never color alone; `isEditingRsvp` correctly resets on a new event ID so no stale editing state leaks across skates; error copy matches the phone's verbatim; scope cuts (no goalie toggle/guests/beer-whiskey-guy on the watch) look like the right call, would flag adding them back as out of scope absent real usage signal. Minor/unverified: large Dynamic Type accessibility sizes not tested against the tight 3-button row."

**Chairman response:**
_[blank for chairman to fill in]_

**[LOGAN] — Phone Unreachable Mid-Tap (Converges With Amy's Finding, Architecture Angle)**
> "Reachable path (`sendMessage` with real replyHandler) is correctly closed-loop. Unreachable path falls back to `transferUserInfo`; the phone's `didReceiveUserInfo` handler calls `handleRsvpMessage(userInfo) { _ in }` — reply discarded. JS still submits and still calls `respondToRsvpRequest`, but into a closure that does nothing. Nothing tells the watch on failure. Worse: since the failed submit doesn't invalidate the query cache, the next natural Home refetch reproduces the identical payload already in `lastSent.current` and gets suppressed by the diff-check in `useWatchConnectivity.ts:58-67` — the watch can be stuck showing a status the server never accepted, with no future event that will correct it, until something else changes Home data. Cheapest fix: don't suppress-on-diff for RSVP-affecting fields, or force a context push after every `onRsvpRequest` handling regardless of success."

**Chairman response:**
_[blank for chairman to fill in]_

**[LOGAN] — App Killed During Pending Reply**
> "Watch side: `NextSkateStore` is scoped to the live process (`@StateObject`) — if the app suspends between optimistic apply and reply, rollback never fires, and the optimistic value can get durably written to `WatchSharedStorage` (which the complication reads) before any correction. Phone side: `pendingReplies` dict in `ExpoWatchConnectivityModule.swift:17` is in-memory only; if RN suspends between firing the JS event and the callback, the closure is dropped. The reachable/sendMessage path degrades acceptably (eventual `errorHandler` timeout still triggers rollback); the unreachable/transferUserInfo path has no expiry and no recovery at all — not slow, never."

**Chairman response:**
_[blank for chairman to fill in]_

**[LOGAN] — Stale Cached WCSession Context on Cold Launch / `updatedAt` Dead Code**
> "`deliverCachedContextIfAny()` intentionally returns cached context so cold launch isn't stuck waiting — reasonable. But `WatchPayload.updatedAt` is written on every push and **never read anywhere** in `targets/` — dead code masquerading as a safety mechanism. If the phone hasn't been foregrounded in days, the watch presents a stale 'next skate' with a live, tappable RSVP row against a possibly-invalid `eventId`. Fix: wire `updatedAt` into a staleness affordance, or remove it."

**Chairman response:**
_[blank for chairman to fill in]_

**[LOGAN] — JSON Payload Shape Drift Between JS Sender and Swift Decoder**
> "No shared schema between JS sender and Swift decoder — enforcement is a comment ('Keep in sync with src/api/types.ts'). JS hand-builds camelCase keys matching Swift's default `CodingKeys` derivation, not the server's actual snake_case fields (explicit renaming visible in `useWatchConnectivity.ts:108-111`) — a manual, easy-to-miss sync point. `PhoneConnector.apply`'s `JSONDecoder` uses `try?`, swallowing decode failures with zero diagnostic — watch looks like it stopped receiving updates with no signal why. Same `try?` swallow pattern in `WatchSharedStorage.load()/save()`. This is real drift risk, not hypothetical — the roster-stats field was added by hand-editing both sides in the same session, with no test catching a future mismatch. Recommended: a smoke test feeding the exact dict `watchPayloadFromHome` produces through a `WatchPayload` decode."

**Chairman response:**
_[blank for chairman to fill in]_

**[LOGAN] — Bonus Findings: Concurrent-Tap Race, Cross-Account State Bleed, Triplicated App Group String**
> "**Concurrent-tap race**: single shared `statusBeforeTap` (not keyed by requestId), no `isSubmitting` state, row never disabled during a pending request — double-tap Yes then No can roll back to the wrong state. (Converges with Amy's independent finding.) **Cross-account state bleed**: `useWatchConnectivity()`/`useHome()` run unconditionally regardless of auth state (`app/_layout.tsx:131`, `queries.ts:119-121`, no `enabled: !!token` guard); logout never pushes a cleared context to the watch. Low-probability on today's single-user setup, but a real gap. **App Group string triplicated** across `WatchSharedStorage.swift`, and both `expo-target.config.js` files, with no build-time check they agree — a future edit to one without grepping the others fails silently (complication shows nothing, no error surfaced)."

**Chairman response:**
_[blank for chairman to fill in]_

**[LOGAN] — Priority Order Proposed to the Chairman**
> "Priority order suggested to the chairman: (1) fix the transferUserInfo swallowed-reply path — no compensating mechanism at all; (2) add the JS→Swift payload round-trip smoke test; (3) key `statusBeforeTap` by request, disable the row while pending; (4) decide what `updatedAt` staleness means or remove it; (5) push a cleared context on logout / gate on token. None of this blocks continued UI-polish iteration (presentation-only, doesn't touch these data paths) — but 1 and 2 should close before this goes near a production EAS build or a second real user."

**Chairman response:**
_[blank for chairman to fill in]_

**[ART] — Baseline Compliance: What Holds Together**
> "status/brand colors are faithfully ported with correct hex math — green `#33d17a`, red `#ff5a5f`, amber `#f0a63a`, gray `#9aa0a6` (`WatchDisplay.swift:19-22`) match `theme.ts` exactly and match `RsvpControls.tsx`'s `CHOICE_COLOR`; team tints (`#d4af37` gold, `#c9ced3` black) match `TeamAssignmentCard.tsx` exactly; the roster health split (`skaterTone`/`goalieTone`) is a verbatim, correct port of the *inline* per-tile logic in `app/event/[id]/index.tsx:54-59` (not the single combined `rosterHealth()` in `src/roster.ts` — good catch by the port author that the split really exists on the phone, just not where the docstring suggests); corner radii numerically match tokens (`10` = `radius.md`, `16` = `radius.lg` for the one full-width 'hero' pill, a defensible borrow since there's no direct phone analog); using system text styles instead of the phone's fixed point scale is correct for watchOS's own Dynamic Type system, not drift."

**Chairman response:**
_[blank for chairman to fill in]_

**[ART] — Divergence #1: Quiet Surfaces Use Non-Token Gray Instead of `cardRaised`/`border` (Top Pick to Fix First)**
> "three 'quiet' surfaces — unselected Yes/No/Maybe chips (`RsvpButtonRow.swift:26`), the 'Change RSVP' button (`RsvpActionArea.swift:29`), the fill-bar track (`RosterFillBar.swift:26`) — use `Color.gray.opacity(0.25)` with no border, instead of the app's actual secondary-surface tokens (`colors.cardRaised` #101010 / `colors.border` #1a1a1a) that the phone's own 'Change RSVP' button uses (`RsvpControls.tsx:199`, `ui.tsx:47,49`). `.gray` at 25% over black composites to roughly `#232324` — visibly lighter than either token. Same named component, genuinely different non-token colors on the two platforms; the phone's secondary button is deliberately quiet (nearly disappears into bg), the watch's equivalent reads louder in the screenshots."

**Chairman response:**
_[blank for chairman to fill in]_

**[ART] — Divergence #2: Hardcoded `.black.opacity(0.85)` Instead of `colors.goldText`**
> "text-on-color uses hardcoded `.black.opacity(0.85)` (`RsvpStatusBadge.swift:14`, `RsvpButtonRow.swift:29`) instead of `colors.goldText` (#111111, `theme.ts:15`), which exists for exactly this and is what the phone uses for its selected chip (`RsvpControls.tsx:134`). Composites to a different color per-badge-hue on the watch vs. one flat value on the phone. Not a legibility problem in the screenshots, but a hardcoded literal standing in for an existing token."

**Chairman response:**
_[blank for chairman to fill in]_

**[ART] — Divergence #3: `.secondary` Used Instead of `colors.textMuted` Across Six Files**
> "most secondary/caption text uses SwiftUI's semantic `.secondary` instead of `colors.textMuted` (#9aa0a6) — which `WatchDisplay.swift` itself already cites correctly for the no-response state — inconsistent within the same file's own stated goal of matching theme.ts. Affects `NightHeaderView.swift:27`, `JerseyBadge.swift:25`, `RosterFillBar.swift:21`, `RosterStatusView.swift:15`, `NoSkateView.swift:13`, `WaitingForPhoneView.swift:11`."

**Chairman response:**
_[blank for chairman to fill in]_

**[ART] — Divergence #4: Roster Fill Bar "Temperature" Behavioral Difference (Flagged as a Question, Not a Bug)**
> "the phone's single roster FillBar is toned by the *combined* `rosterHealth()`, which goes red the instant goalies are needed even though the bar visually represents skater fill — so 'needs goalies' turns the phone's skater bar red too. The watch's two independent bars never do this (skater bar stays amber for skater reasons only). Disclosed as intentional in the CHANGELOG; the watch's version is arguably more precise, but the same numbers now render a different overall 'temperature' per surface — worth a conscious sign-off rather than assumed equivalence."

**Chairman response:**
_[blank for chairman to fill in]_

**[ART] — Divergence #5: Wordmark Legibility at 18pt**
> "the wordmark at 18pt (`NightHeaderView.swift:19`, down from the phone's native 150×42pt use) is roughly 3x smaller than its phone treatment; the crossed-sticks/'OBH' silhouette reads fine in `watch-tighten-final.png` but the 'INVITES' ribbon text inside the bitmap is almost certainly below legible size. May be fine as a logomark, but the CHANGELOG frames this pass as adding the wordmark for legibility, and at 18pt it functions as an icon, not readable text — worth an explicit decision on intent."

**Chairman response:**
_[blank for chairman to fill in]_

**[ART] — Pre-Existing Gold Hex Divergence, Newly Surfaced on the Watch**
> "the project already has two 'gold' hex values — `colors.gold` #d4af37 (all in-app UI) vs. the push/icon accent #e6b422 (`app.json`). The watch's `$accent` (`expo-target.config.js:13`) matches the accent precedent, which is reasonable, but means the watch's own system chrome (Digital Crown highlight, running-app indicator) will be a visibly different gold from every gold inside the app's own UI. Not a defect from this work, but now surfaced on a new device."

**Chairman response:**
_[blank for chairman to fill in]_

**[ART] — Housekeeping: Two of Four Review Screenshots Are Stale**
> "two of the four screenshots supplied for this review (`watch-step2-yes-black.png`, `watch-step2-maybe.png`) are stale — they show the always-visible Yes/No/Maybe row and the 'Teams not set yet' placeholder, both removed per the 09-14 CHANGELOG entries. Only `watch-tighten-final.png` and `watch-badge-order-check.png` reflect the shipped layout."

**Chairman response:**
_[blank for chairman to fill in]_

**[ART] — Compliments: IA Decisions, Not Straight Ports**
> "the full-width color status pill (no phone equivalent — the phone's locked state is just muted text, no fill) is the right call for a glanceable surface; the RSVP→roster→jersey→Change-RSVP ordering reads as a genuine information-architecture decision, not a straight port; the added Goalies bar (no phone equivalent) is a legitimate watch-native addition given the theme's own two-axis roster-health rule. Strongest single recommendation: fix divergence #1 first."

**Chairman response:**
_[blank for chairman to fill in]_

### Resolved Items

_None. No items from this meeting have been resolved; all await the chairman's response above._

---

## Board Decisions Log

| Date | Decision | Decided By |
|------|----------|------------|
| 2026-09-14 | Cross-cutting convergent finding noted for the institutional record: Amy (UX) and Logan (architecture) independently identified the same bug — the `transferUserInfo` fallback path (`PhoneConnector.swift:53-59`, `ExpoWatchConnectivityModule.swift:141-147`) silently discards RSVP failure replies, leaving the watch UI in an unconfirmed optimistic state with no correcting signal. Also noted: all four advisors agreed the presentation-layer work already shipped is sound, and none of the open findings above block continued UI iteration. **This is a board observation recorded for the record, not a chairman decision** — no chairman action has been taken on any item from this meeting. | Noted by board consensus (Charles, Amy, Logan, Art); not decided by the Chairman |

---

**— Dieter, Secretary**

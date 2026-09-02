# Changelog — OBH Skate Invites app

Dates are when the work was done, not released. The app has not shipped to a
store yet.

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

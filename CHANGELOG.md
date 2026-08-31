# Changelog — OBH Skate Invites app

Dates are when the work was done, not released. The app has not shipped to a
store yet.

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

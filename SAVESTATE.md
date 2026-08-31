# Save state — OBH mobile app project

Updated 2026-08-31. "How to resume" doc. See also `CHANGELOG.md` (this repo),
`HANDOFF.md` (Expo Go boot fix), the `invite-server` repo, and Claude's
persistent memory.

---

## TL;DR — where things stand

Bringing the Expo/React-Native app to **feature parity with the Django
website** before a first rollout, keeping director functions separate from
player functions. Working **item by item, server + app together**, each landed
on the test stack and device-tested by the user before the next.

- **App**: `/Users/jvmalone/invite-app`, branch `main`, HEAD `28e3955`.
  **46 commits ahead of GitHub `origin/main` — NOT pushed yet.** Also has a
  `pi` remote. Runs in Expo Go (SDK 54 pinned).
- **Server**: branch `feature/mobile-director-roster` on `invite-server`.
  origin HEAD `627196a`. Deployed to the **test** stack only
  (`https://test-invites.falcon83.com`), Pi worktree `~/invite-server-test`.
  240 `invitations` tests green. **NOT merged to `main`, NOT on prod.**
- **User is NOT ready to deploy.** Do not merge the server branch or ship to
  prod. Do not push the app to GitHub without asking.

Test login: **`admin` / `obh-test-2026`** (superuser ⇒ director + president +
verified). `.env.local` in this repo: `EXPO_PUBLIC_API_URL=https://test-invites.falcon83.com`.
Run the app: `npx expo start -c --go --lan` (must bind LAN, not localhost, or
Expo Go on the phone can't fetch the bundle).

---

## P0 rollout plan — DONE

Plan file: `~/.claude/plans/fluffy-fluttering-hellman.md`. Items 1–7 all
landed (server + app), deployed to test:

1. Forgot password on the sign-in screen (anon `POST /api/auth/password-reset/`)
2. Email-verification recovery (`POST /api/me/resend-verification/` + `VerifyBanner`)
3. Guest RSVP (guest editor in `RsvpControls`, `my_rsvp.guests`, roster `guest_names`)
4. Per-event message thread (`api/event_messages.py` + shared `src/components/chat/ChatThread.tsx`)
5. Invite-list management (roster-admin actions: remove_invite / add_batch / remove_batch / send_invite)
6. League notices post & manage — president only (`api/notices.py`, `Me.is_president`, `app/notices.tsx`)
7. Skate-group members — director (`api/night_admin.py`, `app/night/[id]/members.tsx`)

**Item 8 — iOS dev build for push — NOT done.** Non-coding parallel track.
App + server push code is complete and dormant. Blocked on the Apple Developer
login step of `eas build --profile development --platform ios` (see the old
notes below). Push cannot be tested in Expo Go.

Director-only screens are reached from a **"Director tools"** section on the
**Home** screen (gold label, below Night status, above Sign out); the "League
notices" row shows only for `me.is_president`.

---

## This session's cleanup batch — DONE, needs a final device pass

All committed (`c2c3087`, `5796267`, `2b5d528`, `28e3955`):

- Home: Night status in a bordered card; "Director tools" gold section label
  outside the card; Sign out is a button.
- Event screen: Roster and "Your RSVP" are collapsible cards
  (`CollapsibleCard` in `src/components/ui.tsx`). Roster has
  Yes / Waitlist / Maybe / No / No-reply tabs — this needs server `627196a`
  (`EventDetailSerializer.get_players` no longer excludes NO_RESPONSE).
- RSVP: after submitting, controls grey out + lock; "Save RSVP" → "Change RSVP"
  which re-enables the form (with Cancel).
- All times render 12-hour AM/PM (`src/format.ts` `formatTime` / `formatDateTime`,
  `ChatThread` clock).
- `src/components/TimeField.tsx` — 12-hour **text** field (type "9:00 PM",
  "9pm", "930pm", "21:00" — normalises on blur). Used in Manage → Settings,
  new-event puck drop, schedule-invites. (User rejected a +/- stepper version.)
- Header back button says "Back" (`headerBackTitle` in `app/_layout.tsx`).
- Message-board night tiles fixed 44px, wrap centered (`app/(tabs)/messages.tsx`).
- Keyboard: `src/components/KeyboardAwareScrollView.tsx` on profile / new-event /
  notices / event detail / manage. `ChatThread` composer now offsets by
  `useHeaderHeight()` instead of a hard-coded 90 (`28e3955` — was covering the
  input + send button on Dynamic Island devices; **not yet verified on device**).

---

## RESUME HERE

1. **Device-test the keyboard fix** (`28e3955`) and the rest of the cleanup
   batch in Expo Go.
2. **Back up the app work**: `git push origin main` (46 commits) and
   `git push pi main` — ask the user first.
3. Work the **P1 / P2 punch-list** items — see
   `<scratchpad>/rollout-punch-list.html` (24 gaps total; the 8 P0 are done).
4. **iOS dev build** for push (item 8) — parallel track, user-driven.
5. When the user says ready: full `invitations` suite, PR
   `feature/mobile-director-roster` → `main`, deploy test → prod.

---

## Server dev workflow (Pi)

Edit in the scratchpad clone, then:

```bash
# always re-sync the scratchpad clone before new work
cd <scratchpad>/invite-server
git fetch origin -q && git reset --hard origin/feature/mobile-director-roster -q

# ... make edits ...

rsync -R <changed files> jvmalone@192.168.86.59:/home/jvmalone/invite-server-test/
ssh jvmalone@192.168.86.59 'cd ~/invite-server-test && \
  docker compose exec -T web python manage.py test invitations --settings=invites.settings_test'
ssh jvmalone@192.168.86.59 'cd ~/invite-server-test && docker compose restart web'
# smoke-test with curl against https://test-invites.falcon83.com
# then commit + push ON THE PI:
ssh jvmalone@192.168.86.59 'cd ~/invite-server-test && git add -A && git commit -m "..." && git push -q origin feature/mobile-director-roster'
```

`settings_test` = in-memory SQLite + locmem email + `PUSH_NOTIFICATIONS_ENABLED = False`.
SSH key is passphrase-protected — user runs `ssh-add --apple-use-keychain ~/.ssh/id_ed25519`
once per session.

**NOTE:** `~/invite-server-test` on the Pi is now the **mobile feature-branch
worktree** (this changed this session — the old SAVESTATE said it held
unrelated WIP; that's no longer true).

---

## Environment quirks

- **Expo SDK 54 pinned** — the iPhone's App Store only has Expo Go for SDK 54.
  Do NOT bump SDK while Expo Go is the test surface.
- **App API target**: `https://invites.falcon83.com` baked into `app.json`
  (`extra.apiUrl`); `.env.local` `EXPO_PUBLIC_API_URL` overrides it → test stack.
- Metro must serve LAN URLs: start with `--lan` (a stale localhost-bound Metro
  serves 127.0.0.1 bundle URLs the phone can't reach).
- `npx tsc --noEmit 2>&1 | grep -E "^(app|src)/"` to check types — the nested
  `jvmalone/` dir is pre-existing junk, ignore its errors.
- Bundle check: `curl -s "http://localhost:8081/node_modules/expo-router/entry.bundle?platform=ios&dev=true&hot=false"`
  — expect JS, not a JSON error payload.
- **App can't push to GitHub from the Pi** (fine-grained token 403). This Mac
  can push to both `origin` and `pi`.
- **Server has no Pillow / requests / httpx** — message images use `FileField`;
  push uses stdlib `urllib`.
- `audit()` before/after must go through `DjangoJSONEncoder` (plain JSONField —
  raw `date`/`time` objects 500 the PATCH). Fixed in `6d06208`.
- Roster capacity math (`event_roster_stats`):
  `skaters = max(yes - goalie_yes, 0) + guest_yes + day_skaters`. The waitlist
  gate in `apply_rsvp` + `_auto_promote_waitlist_if_enabled` must use the same
  guest-inclusive occupied count (fixed `bbcd4d0`).

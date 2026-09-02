# Save state — OBH mobile app project

Updated 2026-09-01. "How to resume" doc. See also `CHANGELOG.md` (this repo),
`HANDOFF.md` (Expo Go boot fix), the `invite-server` repo, and Claude's
persistent memory.

---

## TL;DR — where things stand

Expo/React-Native app at **feature parity with the Django website** — P0 and
P1 punch-list done. Director functions kept separate from player functions.
Worked **item by item, server + app together**, each landed on the test stack
and device-tested. Now doing UI polish + heading toward a first release.

- **App**: `/Users/jvmalone/invite-app`, branch `main`, HEAD `f5804d5`.
  **59 commits ahead of GitHub `origin/main` (`Alfwago/invite-app`) — NOT
  pushed.** Also a `pi` remote (`jvmalone@192.168.86.59:~/invite-app`). Runs in
  Expo Go (SDK 54 pinned).
- **Server: SHIPPED to prod as 0.21.0 (2026-09-01).** The website agent merged
  `feature/mobile-director-roster` → `main` (now the same commit, `a4576ac`)
  and deployed. `https://invites.falcon83.com` = 0.21.0 build 59: full mobile
  API + Team-Generator "Push to players" (migration `0077`, applied) + the G+S
  Goalie/Skater prompt (server commit `5e05c02`) + `is_assistant_director`.
  288 `invitations` tests pass. There's now a `/deploy` skill in the server
  repo for the release process. Test stack (`test-invites.falcon83.com`) also
  still runs the same code.
- **App: still local only.** 59 commits on `main`, not pushed to GitHub
  (`Alfwago/invite-app`) or `pi`. Do not push without asking.
- The app's `app.json` already targets prod (`extra.apiUrl`); `.env.local`
  overrides to test for dev. Prod now has the endpoints, so an app build
  pointed at prod will work.

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

## P1 punch-list — DONE (2026-09-01)

Director dashboard, player approval queue, polls (view/vote + authoring),
direct messages / inbox, waitlist reorder + roster extras, Team Generator,
player profiles + ratings, Team-Generator "Push to players" + team-assignment
cards, Goalie & Skater add-prompt. Detail in `CHANGELOG.md` (2026-09-01).

Also done: persistent bottom bar, one flat `NavHeader`, foreground / push
refresh, pure-JS `pickers.tsx` (calendar / time / number dropdowns) replacing
the free-text fields. Gold roster tags (G / ND / AD). Lots of small UI fixes.

Device-tested on the **Android emulator** (Pixel_7) via Expo Go this session —
not re-verified on the test iPhone since the picker/roster changes.

---

## RESUME HERE

1. **Server is on prod** (0.21.0) and QA'd — nothing left there for the mobile
   rollout.
2. **Device pass** on the test iPhone for the 2026-09-01 batch (pickers,
   roster tags/icons, G+S prompt, bottom bar, headers).
3. **Push the app** — `git push origin main` + `git push pi main` (59 commits,
   local only). Ask first.
4. **App store track** — §4 of "Going to production" below. Gated on an Apple
   Developer account + Google Play Console. This is now the only thing between
   here and a release.

---

## Going to production

### 1. Store the work in git (backup — do first)

- **App** (this Mac can push to both):
  `git push origin main` → GitHub `Alfwago/invite-app`;
  `git push pi main` → the Pi bare/worktree repo.
- **Server**: the G+S role-picker work is **live on the test stack but not in
  git**. The website agent needs to `git add app/invitations && git commit &&
  git push origin feature/mobile-director-roster` from `~/invite-server-test`
  (scope the add — `app/media/*.jpg` are test uploads, leave them). Do NOT
  `rsync` over the Pi worktree or `git add -A` there.

### 2. Point the app at the production API — ready now

Resolution order (`src/api/client.ts`): `EXPO_PUBLIC_API_URL` →
`app.json > expo.extra.apiUrl` (= `https://invites.falcon83.com`, already
prod). **Prod now has the full mobile API (0.21.0), so this works.**

- `app.json` is **already** pointed at prod.
- `.env.local` (`EXPO_PUBLIC_API_URL=https://test-invites.falcon83.com`,
  gitignored) overrides it for dev/Expo-Go. Delete/rename it — or start Metro
  in a shell without that var — to hit prod locally.
- `eas.json`: `development` + `preview` profiles pin `EXPO_PUBLIC_API_URL` to
  the **test** stack; `production` has no env override ⇒ falls through to the
  `app.json` prod URL. So `eas build --profile production` already targets prod.

### 3. Get the prod SERVER ready — ✅ DONE (0.21.0, shipped 2026-09-01)

- ✅ G+S changeset committed + pushed (`5e05c02`).
- ✅ 288 `invitations` tests pass (re-verified on prod). Note: they run
  `test invitations`, not the whole `manage.py test`.
- ✅ Website UI changes (roster-panel templates, `theme.css`, `role_picker.js`)
  shipped; user click-tested the web G+S Goalie/Skater prompt several times on
  prod (2026-09-02) — works.
- ✅ Migration `0077` applied on prod (`[X]`).
- ✅ `feature/mobile-director-roster` → `main` (`a4576ac`), deployed, restarted.
- ✅ **Push (server side):** `send_push_notifications` gates on
  `getattr(settings, "PUSH_NOTIFICATIONS_ENABLED", True)` — **default True**;
  only `settings_test.py` sets it False. Prod sends push for any registered
  token. It relays through Expo (`exp.host/--/api/v2/push/send`) — **no APNs
  .p8 / FCM keys on the Django side**. Those live in the Expo project and are
  used at app-build time (§4). So prod push is "enabled but dormant" — no real
  device tokens exist until there's a non-Expo-Go app build.

### 4. Get the prod APP ready (store submission — multi-week, gated on accounts)

- Bump `app.json` `version` (0.1.0 → e.g. 1.0.0). `eas.json` `production` has
  `autoIncrement: true` so build/version codes bump themselves.
- **iOS**: Apple Developer Program ($99/yr) → App Store Connect app record →
  `eas build --profile production --platform ios` → `eas submit` → TestFlight →
  App Store review.
- **Android**: Google Play Console ($25 once) → app record → signing (EAS-
  managed) → `eas build --profile production --platform android` → internal
  testing → production track.
- **Push creds**: APNs .p8 to Expo; Android FCM / `google-services.json`.
- **Legal**: privacy policy URL + App Store privacy labels + Play data-safety
  form (the app collects email, name, phone, push token).
- Full device regression against a prod-like server before submitting.

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

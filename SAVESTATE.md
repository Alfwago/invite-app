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
- **Server**: branch `feature/mobile-director-roster` on `invite-server`.
  origin HEAD `8d6fced`, **~32 commits ahead of `origin/main`**. Deployed to the
  **test** stack only (`https://test-invites.falcon83.com`), Pi worktree
  `~/invite-server-test`. ~280 `invitations` tests green.
  **NOT merged to `main`, NOT on prod.**
  ⚠️ The Pi worktree has an **uncommitted G+S role-picker changeset** from the
  website Claude agent (`roster_admin.py`, `forms.py`, `views.py`, roster-panel
  templates, `role_picker.js`, tests). It's live on test but not in git —
  needs the site agent to commit + push. Only 1 migration on the whole branch:
  `0077_teamhistory_published_at...` (`makemigrations --check` clean).
- **User is NOT ready to deploy.** Do not merge the server branch or ship to
  prod without an explicit go. Do not push the app to GitHub without asking.

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

1. **Device pass** on the test iPhone for the 2026-09-01 batch (pickers,
   roster tags/icons, G+S prompt, bottom bar, headers).
2. **Source control — do this soon, both sides are only on local disk / the
   test box:**
   - App: `git push origin main` + `git push pi main` (59 commits). Ask first.
   - Server: the website agent commits the G+S changeset on the Pi and pushes
     `feature/mobile-director-roster` (see the ⚠️ in the TL;DR).
3. **iOS dev build** for push (item 8) — still blocked on Apple Developer login.
4. **Going to production** — see the section below.

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

### 2. Point the app at the production API

Resolution order (`src/api/client.ts`): `EXPO_PUBLIC_API_URL` →
`app.json > expo.extra.apiUrl` (= `https://invites.falcon83.com`, already
prod).

- `app.json` is **already** pointed at prod.
- `.env.local` (`EXPO_PUBLIC_API_URL=https://test-invites.falcon83.com`,
  gitignored) overrides it for dev/Expo-Go. Delete/rename it — or start Metro
  in a shell without that var — to hit prod locally.
- `eas.json`: `development` + `preview` profiles pin `EXPO_PUBLIC_API_URL` to
  the **test** stack; `production` has no env override ⇒ falls through to the
  `app.json` prod URL. So `eas build --profile production` already targets prod.
- ⚠️ Prod (`origin/main`) does **not** have the ~32 mobile-API commits yet, so
  aiming the app at prod today = most director/mobile screens 404. Server merge
  (step 3) must land first.

### 3. Get the prod SERVER ready

- Commit + push the G+S changeset (step 1).
- Clean checkout of `feature/mobile-director-roster`, run the **full** test
  suite (not just `invitations` on the worktree): `python manage.py test`.
- The branch also changes **website** UI (roster-panel templates, `theme.css`,
  `role_picker.js`, `_role_picker_script.html`) — review/QA those on the site,
  not just the API.
- Migrations: only `0077_teamhistory_published_at...`. `makemigrations --check`
  is clean. Confirm it applies on the prod DB (watch the historical
  `fix/dup-migration-0003` situation).
- PR `feature/mobile-director-roster` → `main`. Merge.
- Deploy `main` to prod, `collectstatic`, `migrate`, restart.
- **Push**: prod needs `PUSH_NOTIFICATIONS_ENABLED = True` + real APNs key
  (.p8) / FCM credentials. Coupled to the iOS build (item 8).

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

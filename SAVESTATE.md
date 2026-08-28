# Save state — OBH mobile app project

Paused 2026-08-27. This is the "how to resume" doc. Also see:
- `CHANGELOG.md` (this repo) — what was built
- `invite-server` repo `CHANGELOG.md` + `PICKUP_NOTES.txt` — the API side
- Claude's persistent memory covers all of this too

---

## Where things stand

### Server API — DONE and DEPLOYED to production

All on `invite-server`, branch `feature/mobile-api` which **==** `main`.
Prod HEAD: `b98656e`. Migration `0070_pushtoken` applied. 69 tests pass.

Live endpoints (all under `https://invites.falcon83.com/api/`, token auth):

| | |
|---|---|
| `POST auth/login/` `POST auth/logout/` `GET me/` | auth + profile |
| `GET events/` `GET events/<id>/` | list + detail (roster stats, my_rsvp) |
| `POST events/<id>/rsvp/` | player RSVP (yes/no/maybe, goalie, guests, beer/whiskey) |
| `POST events/next/` `PATCH events/<id>/` | director: create next, edit settings |
| `POST events/<id>/send-invites/` `POST events/<id>/send-batch/` | director: send |
| `GET nights/` | director's skate groups (create-event picker) |
| `GET home/` `GET notices/` `GET boards/` | home screen data |
| `GET/POST messages/` `DELETE messages/<id>/` | message board (text + photo) |
| `POST push/register/` `POST push/unregister/` | push tokens |

Server pushes on **invite sent** and **waitlist promotion** (`data.eventId`
deep-links). Push send is best-effort, prunes dead tokens, smoke-tested live
against Expo's API.

### App — running in Expo Go; push code in place but dormant

GitHub `github.com/Alfwago/invite-app`, HEAD `0839ed7` ("eas init").
Dev copy: `~/invite-app` on the Mac.

**GitHub is missing 2 commits from the Pi** (`/home/jvmalone/invite-app`):
`0eb59be` (push notification app code) and `cf84788` (eas.json tweak). Get them:
```bash
cd ~/invite-app
git fetch pi && git merge pi/main && git push
npm install && npx expo install --fix
```
(The Pi remote: `git remote add pi jvmalone@192.168.86.59:/home/jvmalone/invite-app`)

---

## RESUME HERE

**Goal when paused:** build an iOS development client so push notifications work
(Expo Go on SDK 53 can't do remote push).

**Blocker:** "won't accept my username and password" — during
`eas build --profile development --platform ios`, at the **Apple Developer
login** step (Expo login already worked — `eas init` is committed).

### Next steps

1. Merge the 2 pending Pi commits (above) so `src/push.ts` etc. are present.
2. `npx eas-cli@latest build --profile development --platform ios`
   - Apple ID = the Apple Developer account email + password
   - It then asks for an Apple **2FA code** (pushed to your Apple devices) —
     the username/password prompt failing is often actually the 2FA step, or a
     stale session: `npx eas-cli@latest logout` then retry, or check the Apple
     ID at appleid.apple.com first.
   - Let EAS **manage credentials** when asked.
   - Register the iPhone as a test device (follow the link on the phone).
   - ~15–20 min cloud build → install link.
3. `npx expo start --dev-client`, open the installed build, log in.
4. Verify: as a director, send invites for an event → app-installed accounts get
   a notification → tap opens the event.

---

## Still pending (not started / paused)

- **UI design pass** — `/design` skill (Claude Design canvas). Paused before
  building. Direction chosen: refine the current dark/gold into a polished
  system. Wants: style guide + all screens + director flows + empty/error/loading
  states. Output → `src/theme.ts` + component styles.
- **Guest RSVP UI** — API supports `guests[]` but `EventDetailSerializer` has no
  `allow_guests` field, so the app hides guest controls. Add that field first.
- **Directors "email/SMS the group"** when posting to a message board (web-only).
- **Click-test** the web `create_next_event` / `send_invites` pages — refactored
  onto shared services, deployed, but never exercised through the website UI.
- **Phase 5** — app icon + splash, store listings, `eas submit`.

---

## Environment quirks (bitten by these)

- **Pi can't push to `Alfwago/invite-app`** (fine-grained token, 403). Claude
  edits + commits on the Pi (`/home/jvmalone/invite-app`); you `git fetch pi &&
  git merge pi/main && git push` from the Mac. Pi CAN push to `invite-server`.
- **Pi has no Node** (aarch64) — app is hand-authored there, built on the Mac.
- **Server has no `Pillow`, no `requests`/`httpx`** — message images use
  `FileField` not `ImageField`; push uses stdlib `urllib`.
- **Mac npm**: global dir + `~/.npm` cache were root-owned from past `sudo npm`.
  Fixed cache with `sudo chown -R 501:20 ~/.npm`. Don't `npm i -g` — use `npx`.
- **App API target**: `https://invites.falcon83.com` baked into `app.json`
  (`extra.apiUrl`); override with `EXPO_PUBLIC_API_URL` in `.env.local`.
- **Server deploy**: `cd /home/jvmalone/invite-server && git pull --ff-only
  origin main`, then `docker compose exec web python manage.py migrate` if there
  are migrations, then `docker restart invite_web invite_scheduler` (or
  `./restart.sh` to rebuild). Tests: run in a throwaway container —
  `docker run --rm --env-file /home/jvmalone/invite-server/.env -v
  /home/jvmalone/invite-server-mobile/app:/code -w /code invite-server-web
  python manage.py test invitations --settings=invites.settings_test`
- **Do not touch** `/home/jvmalone/invite-server-test` (worktree on
  `fix/site-ux-cleanup` with unrelated uncommitted WIP).

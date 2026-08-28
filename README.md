# OBH Skate Invites — mobile app

React Native + Expo (TypeScript) client for the `invite-server` Django backend.
Directors and players both use it: players RSVP, directors create the next event,
edit the director message, and send invites.

The app is a **thin HTTPS client** — all logic lives in the server's
`/api/` surface (`invitations/api/` in the invite-server repo). This is its own
git repo, separate from the server.

## First-time setup (on the Mac)

Node and the Expo toolchain don't run on the Raspberry Pi, so this skeleton was
authored by hand. On the Mac:

```bash
cd invite-app
npm install
npx expo install --fix        # aligns native package versions to the Expo SDK
cp .env.example .env.local     # then edit EXPO_PUBLIC_API_URL if needed
npx expo start
```

Press `i` for the iOS simulator, `a` for Android, or scan the QR code with the
**Expo Go** app on a physical phone.

`npx expo install --fix` matters: the versions in `package.json` are best-guess
pins for Expo SDK 53. Let the CLI correct them for whatever SDK actually installs.

## Which server does it talk to?

Resolution order (see `src/api/client.ts`):

1. `EXPO_PUBLIC_API_URL` from `.env.local`
2. `expo.extra.apiUrl` in `app.json` (baked-in production default:
   `https://invites.falcon83.com`)

For local backend testing, run the Django server and set
`EXPO_PUBLIC_API_URL=http://<your-mac-LAN-IP>:8000` — a phone can't reach
`localhost`.

## Layout

```
app/                       Expo Router file-based routes
  _layout.tsx              providers (React Query, Auth) + auth-gated Stack
  login.tsx                token login (POST /api/auth/login/)
  (tabs)/_layout.tsx       Home · Events · Messages · Profile
  (tabs)/index.tsx         Home: notices, "your next skate", night-by-night list
  (tabs)/events.tsx        upcoming / recent events list
  (tabs)/messages.tsx      message board: board switcher, posts (text + photo)
  (tabs)/profile.tsx       /api/me/ + sign out (header "Log out" button too)
  event/[id].tsx           event detail, RSVP, director panel
  new-event.tsx            director "create next event" (modal)
src/
  api/                     client.ts (fetch wrapper), endpoints.ts, types.ts
  auth/AuthContext.tsx     token in expo-secure-store, restores on cold start
  hooks/queries.ts         React Query hooks + mutations
  components/              EventCard, RsvpControls, DirectorPanel, LogoutButton, ui.tsx
  theme.ts, format.ts
```

## Endpoints used

| Screen | Calls |
| --- | --- |
| login | `POST /api/auth/login/` |
| profile | `GET /api/me/`, `POST /api/auth/logout/` |
| home | `GET /api/home/` |
| events list | `GET /api/events/` (`?past=1`) |
| event detail | `GET /api/events/<id>/` |
| RSVP | `POST /api/events/<id>/rsvp/` |
| messages | `GET /api/boards/`, `GET/POST /api/messages/`, `DELETE /api/messages/<id>/` |
| new event | `GET /api/nights/`, `POST /api/events/next/` |
| director panel | `PATCH /api/events/<id>/`, `POST .../send-invites/`, `POST .../send-batch/` |

## Push notifications

Wired up (`src/push.ts` + `AuthContext` + the tap handler in `app/_layout.tsx`):
on login the app asks permission, gets an Expo push token, and POSTs it to
`/api/push/register/`; logout unregisters. The server pushes on **invite sent**
and **waitlist promotion**; tapping the notification opens the event.

**Remote push does not work in Expo Go on SDK 53** — it needs a development
build. To turn it on:

```bash
npm i -g eas-cli
eas login
eas init                       # creates the EAS project + writes extra.eas.projectId
eas build --profile development --platform ios   # (or android)
```

Install that build on your phone, run `npx expo start --dev-client`, and
`registerForPush()` will start working. Until then it logs a warning and no-ops.

## Not done yet

- Guest RSVPs — the API supports `guests[]` but `EventDetailSerializer` doesn't
  expose `allow_guests`, so the UI hides it. Add that field server-side when
  building this.
- Directors' "email / SMS the group" option when posting to a board.
- App icon / splash screen (using Expo defaults).
- Store listings / submission (`eas.json` build+submit profiles are stubbed in).

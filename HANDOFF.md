# Handoff — get the app running in Expo Go, then resume design

Written 2026-08-31 by the Pi-side Claude session. Work now moves to **this Mac**,
where Claude Code can actually run `npm` / `expo start` and read Metro output.

## The goal, in order

1. **Get the app to load the login screen in Expo Go on the user's iPhone.**
   This has been the blocker all day.
2. Then resume the **UI design iteration** (dark/gold restyle to match the
   website — see `SAVESTATE.md` "UI design pass" + `design/`).
3. Later, separately: iOS/Android **dev build** for push notifications
   (`eas.json` already has a `development` profile; blocked on an Apple
   Developer login issue — not today's problem).

## Hard constraint discovered today

The iPhone's App Store only offers **Expo Go for SDK 54** (no SDK 57 build
available for this device). So the project is **pinned to Expo SDK 54** — do
NOT bump to 57 while Expo Go is the test surface. SDK 57 is the target for the
eventual dev build / store submission only.

## What was done today (commits on `pi/main`, up to `94b0b89`)

- `06ada21` / `d8e417c` — pinned `package.json` to a consistent **SDK 54**
  bundled set (RN 0.81.5, React 19.1.0, expo-router ~6.0.24, etc.), kept
  `expo-dev-client`, added `react-native-web` + `react-dom`, re-added `.npmrc`
  (`legacy-peer-deps=true`).
- `e9c2408` / `d8e417c` — `app.json`: removed `newArchEnabled` and
  `android.edgeToEdgeEnabled` (rejected by the SDK 54 config schema) and the
  bogus `"expo-status-bar"` entry from `plugins` (it's not a config plugin —
  it was breaking `expo start` entirely).
- `94b0b89` — **made push code Expo Go-safe.** Expo Go (SDK 53+) has no
  `ExpoPushTokenManager` / `ExpoDevice` native modules; importing
  `expo-notifications` / `expo-device` at module scope was crashing the whole
  app on launch (symptom: *every* route logged "missing the required default
  export"). Now:
  - `src/push.ts` exports `pushSupported` (false on web + in Expo Go, via
    `Constants.appOwnership` / `executionEnvironment`); all
    `expo-notifications` / `expo-device` access is behind it and uses lazy
    `require()`.
  - `app/_layout.tsx` no longer imports `expo-notifications` at the top; the
    notification-routing effect lazy-requires it only when `pushSupported`.

## Pull those 4 files onto this Mac (avoids the merge conflicts we kept hitting)

```
cd ~/invite-app
git fetch pi
git checkout pi/main -- src/push.ts app/_layout.tsx package.json app.json HANDOFF.md
npm install
git add -A && git commit -m "Expo Go-safe push code; SDK 54 pin"
```

(`pi` remote = `jvmalone@192.168.86.59:/home/jvmalone/invite-app`. GitHub
`origin` is stale and can't be pushed to from the Pi — ignore it; this Mac can
push to both.)

## Then run it

```
npx expo start -c --go
```

`--go` is required because `expo-dev-client` is installed (otherwise it tries
to open a dev build that doesn't exist). Scan the QR with the iOS **Camera**
app, or in Expo Go use "Enter URL manually" → `exp://<mac-lan-ip>:8081`.
Do NOT tap old entries under "Recently opened" — they carry a stale
`exp+jvmalone://` dev-build link.

### Last known error (from `94b0b89`, not yet verified on device)

`Cannot find native module 'ExpoDevice'` / `'ExpoPushTokenManager'` at launch.
`94b0b89` should fix it. If something still fails, read the FULL Metro output —
the Pi session was flying blind on these.

Known harmless noise: `ExpoRouterNativeLinkPreview` "native view manager …
isn't exported" warnings (expo-router 6 iOS Link preview; not in Expo Go
SDK 54). Ignore unless `<Link>` navigation actually misbehaves — if so, the fix
is disabling the iOS link preview.

## Backend for testing

Test stack: `https://test-invites.falcon83.com` — put this in
`~/invite-app/.env.local`:

```
EXPO_PUBLIC_API_URL=https://test-invites.falcon83.com
```

Login: **`admin` / `obh-test-2026`** (superuser ⇒ director, email_verified).
Prod API (`https://invites.falcon83.com`) is the baked-in default in `app.json`
`extra.apiUrl` if `.env.local` is absent.

## Repo facts

- `app.json` `slug` is `"jvmalone"` and `owner` is `"alfwagos-team"`, EAS
  `projectId` `ccd02292-6cd0-4556-96ca-55ae6762d0e0` — from an earlier
  `eas init`. The odd slug is why the dev-client scheme is `exp+jvmalone`.
  Leave it unless doing EAS work.
- Expo Router app dir: `app/` — tabs `Home/Events/Messages/Profile`, plus
  `event/[id]`, `login`, `new-event`. `src/` = api client, auth context,
  hooks (React Query), components, `theme.ts`.
- No Node on the Pi; `design/` canvas working files were authored there but
  never assembled.

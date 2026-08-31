# Expo SDK 53 → 57 upgrade (fixes the Expo Go boot crash)

**Why:** Expo Go only ever runs the latest SDK. It now ships **SDK 57**
(React Native 0.86, React 19.2 — released June 2026). The app was on SDK 53
(RN 0.79). The `ReferenceError: Property 'MessageQueue' doesn't exist,
js engine: hermes` crash was a half-upgraded `node_modules`: `expo` got bumped
but `react-native` and friends stayed pinned to 0.79, so Metro bundled two
incompatible React Native copies.

`package.json` has been rewritten (on the Pi) to a **consistent SDK 57 set**.
`.npmrc` (`legacy-peer-deps=true`) was re-added. Now do a clean reinstall on the
Mac.

## Run on the Mac (`~/invite-app`)

```bash
cd ~/invite-app

# 0. get the Pi's package.json + .npmrc (+ this doc)
#    The Mac has a half-done `expo@latest` edit in package.json from the failed
#    attempt — that's the broken state. Throw it away and take the Pi's version:
git checkout -- package.json 2>/dev/null; git stash -u 2>/dev/null || true
git fetch pi && git merge pi/main
# (if the Pi remote is missing: git remote add pi jvmalone@192.168.86.59:/home/jvmalone/invite-app)
# (if merge still conflicts on package.json:  git checkout --theirs package.json && git add package.json && git commit)

# 1. nuke the stale tree — this is the actual fix
rm -rf node_modules package-lock.json ~/.expo
npm install

# 2. let Expo reconcile every version against SDK 57's bundled set
npx expo install --fix

# 3. sanity check — resolve every warning it prints
npx expo-doctor

# 4. typecheck (TS 6 + @types/react 19.2 now)
npm run typecheck

# 5. start clean (clears the Metro + Hermes cache)
npx expo start -c
```

Then open Expo Go on the iPhone, scan the QR, and confirm it boots to the login
screen. Log in against test (`admin` / `obh-test-2026`, `.env.local` →
`EXPO_PUBLIC_API_URL=https://test-invites.falcon83.com`).

## What changed in package.json

| package | 53 → 57 |
|---|---|
| expo | `~53.0.0` → `~57.0.18` |
| react | `19.0.0` → `19.2.3` |
| react-native | `0.79.5` → `0.86.3` |
| expo-router | `~5.0.0` → `~57.0.17` (now version-locked to the SDK) |
| expo-constants / device / image-picker / linking / notifications / secure-store / status-bar | all → `~57.0.x` |
| @expo/vector-icons | `^14` → `^15.0.2` |
| react-native-safe-area-context | `5.4.0` → `~5.7.0` |
| react-native-screens | `~4.11.1` → `~4.26.0` |
| **added** | `expo-system-ui`, `react-native-gesture-handler ~2.32.0`, `react-native-reanimated 4.5.1`, `react-native-worklets 0.10.1` (Expo Go bundles these natively; listing them keeps Metro resolution happy and matches a fresh SDK 57 app) |
| @types/react | `~19.0.10` → `~19.2.2` |
| typescript | `~5.8.3` → `~6.0.3` |
| **removed** | `babel-preset-expo` from devDeps — it ships inside `expo` now; `babel.config.js` still resolves it |

## App source — audited, no code changes needed

Checked every file under `app/` and `src/` for APIs that changed across
SDK 54–57:

- **expo-router** — `Stack`, `Tabs`, `Link`, `useRouter`, `useSegments`,
  `sceneStyle`: all stable.
- **expo-notifications** — `setNotificationHandler` already uses the
  `shouldShowBanner`/`shouldShowList` shape (SDK 52+). Remote push is gone from
  Expo Go, but `registerForPush()` already no-ops without an EAS project id /
  dev build, so nothing breaks.
- **expo-image-picker** — `mediaTypes: ["images"]` is already the array form.
- No `expo-av`, `expo-file-system`, `AsyncStorage`, `@react-navigation/*`,
  `useNavigation`, or `LinearGradient` usage — those are the things SDK 54
  broke.

Non-blocking cleanup for later: `<Image resizeMode="cover">` in
`messages.tsx` — RN wants `style={{ objectFit: "cover" }}` now (warns only).

## app.json — left as-is

`newArchEnabled: true` and `android.edgeToEdgeEnabled: true` are both still
valid in SDK 57 (edge-to-edge is now the unconditional default; the flag is a
no-op but harmless). Not touched — not related to the crash. If `expo-doctor`
flags either, drop it.

## If it still crashes after a clean install

- `npx expo start -c` again — Hermes caches bytecode aggressively.
- Delete Expo Go from the phone and reinstall (old JS runtime cache).
- `npx expo-doctor` — a leftover transitive `react-native@0.79` is the usual
  culprit; `npm ls react-native` should show exactly one, `0.86.3`.

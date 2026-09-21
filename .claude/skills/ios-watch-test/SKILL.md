---
name: ios-watch-test
description: Build and test the OBH Invites iOS app together with its watchOS companion and complication in paired Simulators, then do the pre-archive safety checks before Archiving in Xcode and submitting. Use when the user wants to test/run/simulate the iOS or watch app, "build and test before archiving", check the complication, get the app onto a simulator, or prepare an App Store / TestFlight submission.
---

# Test the iOS app + watch companion, then archive

Runs on the **Mac** (Xcode required), from the `invite-app` repo root. One command
builds the phone app, watch app and complication, installs them on a paired iPhone +
Apple Watch simulator, and launches both. No Metro, no ports.

```sh
npm run ios:test                       # full: prebuild --clean + Release build + install + launch
npm run ios:test -- --skip-prebuild    # only JS/Swift changed: much faster
npm run ios:test -- --archive-check    # pre-archive safety checks (no build)
```

(`npm run ios:test -- --help` lists everything: `--solo`, `--reset`, `--api <url>`, `--prod`,
`--iphone <name>`, `--skip-build`, `--dev`.)

## Workflow

1. **Get the code**: `git pull` (or merge the Pi branch: `git fetch pi <branch> && git merge pi/<branch>`), then `npm install`.
2. **Test**: `npm run ios:test`. First run creates a simulator pair (`OBH-Test iPhone` / `OBH-Test Watch`) and takes a few minutes; later runs reuse it.
   - It builds **Release against the TEST server** by default, so you're testing what gets archived without touching prod data. `--prod` bakes in the production URL (only for a final look; use a throwaway account).
3. **Check by eye** (the script prints this list):
   - iPhone: login screen appears, log in with a test account.
   - Watch: next skate, or the gold hockey-figure "No OBH Skate Scheduled" screen. The watch only gets data once the phone app is logged in and open.
   - Complication: watch simulator, long-press face > Edit > Complications > "OBH Invites".
4. **Iterate**: change code, `npm run ios:test -- --skip-prebuild`. Re-run **without** `--skip-prebuild` after any change to `app.json`, `targets/*/expo-target.config.js`, plugins, or native modules.
5. **Pre-archive**: `npm run ios:test -- --archive-check`. Fix every `!!` line first. Then in Xcode: open `ios/OBHInvites.xcworkspace` (the workspace), scheme **OBHInvites**, destination **Any iOS Device (arm64)**, Product > Archive, then Distribute App.

## Why it works this way (don't undo these)

- **Release, not Debug**: embeds the JS bundle, so there's no dev server. The old `expo run:ios` + Metro route failed repeatedly: VS Code's helper holds port 8081, and a build run from Xcode compiles in 8081 (the bundler port is a build-time constant; only the `RCT_jsLocation` user default overrides it at runtime).
- **`xcodebuild` + `simctl`, never `expo run:ios`**: on Xcode 27 `Simulator.app` isn't registered with macOS (`osascript -e 'id of app "Simulator"'` fails, and Xcode has no `Developer/Applications`), which makes `expo run:ios` abort with "Can't determine id of Simulator app". `simctl` doesn't need it.
- **Always `expo prebuild --platform ios --clean`**: a non-clean prebuild crashes partway and leaves the watch targets with the phone's device family, so Xcode refuses to run them (see `plugins/withWatchDeviceFamily.js`). `ios/` is generated and git-ignored.
- **The phone scheme builds everything**: the watch app is embedded in the phone app (`Embed Watch Content`), the complication inside the watch app. The script installs the phone app, waits for the watch app to arrive on the paired watch, and installs it directly if it doesn't.

## The archive traps `--archive-check` guards against

- **Test server baked into the submission.** `.env.local` sets `EXPO_PUBLIC_API_URL` to the test server and Expo reads it in *every* mode, so an Xcode Archive on a machine with that file ships the test URL. The check reports which file wins and fails unless it resolves to production. Fix: remove or rename that line/file before archiving (restore it afterwards for dev).
- **Version/build drift.** Phone app version/build come from `app.json` (written into its Info.plist); the watch app and complication take theirs from build settings. All must match, and the build number must be higher than the last App Store Connect upload. Bump `expo.ios.buildNumber` in `app.json`, then re-run without `--skip-prebuild`.
- **Watch targets with the wrong device family** (must be `4`), a missing signing team, or bundle IDs that don't nest (`…obhinvites` > `.watch` > `.watch.widget`).

## Troubleshooting

- **Watch stuck on "Waiting for iPhone…" after the phone is logged in**: read the sync logs on both simulators (both sides log under subsystem `com.falcon83.obhinvites`):
  ```sh
  xcrun simctl spawn <PHONE-UDID> log show --last 10m --info --predicate 'subsystem == "com.falcon83.obhinvites"'
  xcrun simctl spawn <WATCH-UDID> log show --last 10m --info --predicate 'subsystem == "com.falcon83.obhinvites"'
  ```
  Phone should log `phone session activated: … watchAppInstalled=true` then `pushed context, keys: nextSkate,updatedAt`; watch should log `didReceiveApplicationContext` then `received phone context`. `push deferred: … isWatchAppInstalled=false` = the watch app isn't installed as this phone's companion (reinstall the phone app so the embedded watch app comes with it). `couldn't decode phone context` shows the decode error. Past causes fixed: pushes dropped when the session wasn't ready yet, and the watch rejecting the phone's fractional-second ISO date (`toISOString()`).

- **Phone shows the Expo dev launcher ("Development Build", "No development servers found", "Enter URL manually"), watch stuck on "Waiting for iPhone…"**: a Debug build replaced the Release one. Cause: `expo run:ios` / `npm run ios` / `expo start` + `i` build and install a Debug app *before* failing with "Can't determine id of Simulator app". Never run those here; use only `npm run ios:test`. Restore with `npm run ios:test -- --skip-prebuild --skip-build --solo` (reinstalls the existing Release build). The watch only leaves "Waiting for iPhone" once the phone app is logged in and running JS.
- **`--dev` leaves a Debug build, which shows the Expo launcher**, not the app: tap "Enter URL manually" and enter `http://localhost:8090` (the script also tries a deep link). It also replaces any Release build in `ios/build`, so a later `--skip-build` has nothing to install and says so. Use `--dev` only for hot reload; use the default Release run for pre-archive testing.
- **Look at the simulator without Simulator.app**: `xcrun simctl io <UDID> screenshot ~/Desktop/phone.png` (phone) and the watch UDID for the watch, then `open` them.

- **Red "Could not connect to development server" screen = you're looking at the wrong simulator.** This script only installs *Release* builds, which never contact a dev server; that error means an old Debug build on some other booted iPhone. The script prints `>>> TEST ON: <iPhone> + <Watch> <<<` and warns about other booted simulators; use `--solo` to shut the others down. Check a device with `APP=$(xcrun simctl get_app_container <UDID> com.falcon83.obhinvites app); ls "$APP" | grep main.jsbundle` (Release has it, Debug doesn't).
- It reuses an existing paired iPhone+Watch (preferring `OBH-Test` ones) rather than always making a new pair.
- **New watch code not showing up**: the script now always reinstalls the embedded watch app (an old version treated "watch app already present" as done, leaving a stale watch app running after a rebuild). To confirm what's on the watch: `W=$(xcrun simctl get_app_container <WATCH-UDID> com.falcon83.obhinvites.watch app); grep -c "some new string" "$W"/*`. Also remember the no-skate screen only appears for an account with no upcoming skate; the canvas preview in `NoSkateView.swift` shows it regardless.

- `xcode-select -p` must print `/Applications/Xcode.app/Contents/Developer` (else `sudo xcode-select -s …`).
- No simulator runtimes: Xcode > Settings > Components, download iOS and watchOS.
- Build failed: the script prints the first `error:` lines and the log path (`ios/build/xcodebuild.log`).
- Weird state / stale login: `npm run ios:test -- --reset` erases both simulators.
- Watch shows "waiting for phone": simulator-to-simulator WatchConnectivity reachability is unreliable; open the phone app, log in, retry. Anything about "iPhone not reachable" needs a real device.
- The app has native modules (`modules/watch-connectivity`) and watch targets: **Expo Go can't run it**, only a native build like this one.

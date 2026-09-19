# Trying the watch app + complication in Xcode

Mac only (Xcode needed). The `ios/` folder is generated and git-ignored, so you
build it fresh from the repo.

## 1. Generate the project (once, and after any target/config change)

```sh
git pull                              # get the latest (incl. the no-skate complication)
npm install
npx expo prebuild --platform ios --clean
open ios/OBHInvites.xcworkspace       # the .xcworkspace, not the .xcodeproj
```

Always use `--clean`. A non-clean prebuild crashes partway through and leaves the
watch targets set to iPhone/iPad, which Xcode then refuses to run on a watch
(see `plugins/withWatchDeviceFamily.js`).

Three targets should be listed: **OBHInvites** (phone), **OBH Invites Watch**,
**OBH Invites Complication**. Signing team is set for you (`8977MZW8RA`); if Xcode
still complains, pick your team under Signing & Capabilities for all three.
If the watch/complication schemes aren't in the scheme picker, use
Product > Scheme > Manage Schemes > Autocreate Schemes Now.

## 2. Fastest look at the complication: Xcode previews (no simulator)

1. Open `targets/watch-widget/NextSkateComplication.swift`.
2. Show the canvas (Editor > Canvas, or Option+Cmd+Return).
3. Pick each preview (Circular / Rectangular / Inline / Corner) and step through the
   timeline entries. Each one has a normal skate entry and a **no-skate** entry.

The no-skate look is a hockey-figure icon: circular "No skate", rectangular
"No Skate / Nothing scheduled", inline "No skate scheduled", corner icon + label.

The watch app's own no-skate screen previews from `targets/watch/Views/NoSkateView.swift`.

## 3. Run it in the simulator

1. Scheme **OBHInvites** (phone) > an iPhone simulator > Run. Log in.
   Use a **paired** iPhone + Apple Watch simulator pair (Window > Devices and
   Simulators > Simulators > + > "Paired Apple Watch").
2. Switch to scheme **OBH Invites Watch**, destination = the paired Apple Watch
   simulator, Run. The watch app receives its data from the phone app.
3. To see the **no-skate** state: log in as an account with no upcoming skate
   (e.g. a fresh test account on the test server; `EXPO_PUBLIC_API_URL` in
   `.env.local` selects the server). The watch app shows the hockey icon
   screen, and the complication does the same.
4. Put the complication on the face: in the watch simulator, long-press the face >
   Edit > swipe to complications > tap a slot > "OBH Invites".
   Or run scheme **OBH Invites Complication**; Xcode asks which widget family and
   face slot to launch into.

Changing state: the complication reloads whenever the watch app receives new data,
and at local midnight if a skate is showing (a skate whose date has passed turns into
the no-skate look on its own).

## Known simulator limits

- Phone-to-watch reachability isn't modeled faithfully between simulators, so the
  "iPhone not reachable" behavior needs a real device.
- Push-driven updates use WatchConnectivity; if the watch shows "waiting for phone",
  make sure the phone app is running and logged in.

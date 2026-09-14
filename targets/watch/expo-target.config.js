/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "watch",
  name: "OBH Invites Watch",
  displayName: "OBH Invites",
  // watchOS 10 brought the vertical-paging TabView / redesigned navigation
  // this UI is built around (see step 2); the only device this runs on is
  // the developer's own, so there's no back-compat reason to go lower.
  deploymentTarget: "10.0",
  colors: {
    // Matches the app-icon / push accent color used elsewhere (app.json
    // expo-notifications plugin, assets/icon.png).
    $accent: "#e6b422",
  },
  // WidgetKit, to call WidgetCenter.shared.reloadAllTimelines() after
  // writing fresh data for the complication (step 4) to pick up.
  frameworks: ["WidgetKit"],
  // Shared with targets/watch-widget only (see its expo-target.config.js
  // and targets/_shared/WatchSharedStorage.swift) — App Groups don't cross
  // devices, so this has nothing to do with the phone.
  entitlements: {
    "com.apple.security.application-groups": ["group.com.falcon83.obhinvites.watch"],
  },
});

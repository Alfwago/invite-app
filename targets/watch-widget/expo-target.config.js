/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "watch-widget",
  name: "OBH Invites Complication",
  displayName: "OBH Invites",
  // Must nest under the WATCH app's own bundle id
  // (com.falcon83.obhinvites.watch), not the phone app's — this is a
  // widget extension embedded inside the watch app, not the phone app.
  // The default derivation doesn't know that nesting, so it's explicit.
  bundleIdentifier: "com.falcon83.obhinvites.watch.widget",
  deploymentTarget: "10.0",
  colors: {
    $accent: "#e6b422",
  },
  // Not auto-synced from the main app like `widget`/`share`/`clip` are —
  // this group is scoped to the watch (shared with the `watch` target
  // only; see targets/_shared/WatchSharedStorage.swift, which both read
  // and write it). Must match targets/watch/expo-target.config.js exactly.
  entitlements: {
    "com.apple.security.application-groups": ["group.com.falcon83.obhinvites.watch"],
  },
});

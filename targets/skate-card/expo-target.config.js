/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  // A widget extension is how iOS hosts Live Activities: this target holds
  // only the skate-day lock-screen card / Dynamic Island UI (no home-screen
  // widgets). The phone app starts it and reports its push tokens through
  // modules/skate-card; invite-server's skate_card.py drives it over APNs.
  type: "widget",
  name: "OBH Skate Card",
  displayName: "OBH Invites",
  bundleIdentifier: ".skatecard",
  // Live Activities with ActivityContent / staleDate need 16.2. The phone
  // app itself stays on 15.1; older phones simply don't get the card.
  deploymentTarget: "16.2",
  colors: {
    $accent: "#e6b422",
    $widgetBackground: "#000000",
  },
  frameworks: ["SwiftUI", "WidgetKit", "ActivityKit"],
});

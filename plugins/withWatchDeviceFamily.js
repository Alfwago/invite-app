const { withXcodeProject } = require("expo/config-plugins");

/**
 * @bacons/apple-targets crashes partway through its own Xcode-project mod
 * on every non-clean `expo prebuild` against an existing ios/ folder
 * ("Target ... already exists, updating instead of creating a new one" ->
 * TypeError in withIosXcodeProjectBeta2BaseMod). Confirmed reproducible: it
 * always gets far enough to clobber TARGETED_DEVICE_FAMILY on the watch app
 * + widget extension targets to "1,2" (iPhone/iPad) before it dies, which
 * makes Xcode refuse to run them on any actual Apple Watch or Watch
 * simulator ("doesn't match any of the app's targeted device families").
 *
 * This runs after apple-targets (see plugin order in app.json) and forces
 * it back to "4" (Apple Watch) on every watchOS build config, identified by
 * SDKROOT rather than by target name so it doesn't need updating if a
 * target gets renamed.
 */
module.exports = function withWatchDeviceFamily(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const configs = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configs)) {
      const buildSettings = configs[key].buildSettings;
      if (!buildSettings || buildSettings.SDKROOT !== "watchos") continue;
      buildSettings.TARGETED_DEVICE_FAMILY = 4;
    }
    return cfg;
  });
};

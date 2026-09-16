const { withInfoPlist, withXcodeProject } = require("expo/config-plugins");

/**
 * `expo prebuild` writes CFBundleShortVersionString/CFBundleVersion into
 * Info.plist as literal resolved strings (e.g. "1.2.0" / "2") copied
 * straight from app.json, rather than the $(MARKETING_VERSION) /
 * $(CURRENT_PROJECT_VERSION) build-variable substitution Xcode's own
 * version-bump UI (and this plugin's sibling fixes) actually edit.
 *
 * That's silent and easy to miss: editing the Version/Build fields in
 * Xcode's target Identity inspector, or MARKETING_VERSION/
 * CURRENT_PROJECT_VERSION directly, has ZERO effect on the archived app —
 * the literal string in Info.plist wins every time, and a real device
 * build/App Store submission keeps shipping whatever version app.json had
 * at the moment of the last prebuild. Bit us twice already on this
 * project. This swaps them for the substitution form so those edits (and
 * app.json's own version bumps, still resolved correctly at build time
 * through the variable) actually take effect.
 */
/**
 * Expo's own version-syncing is inconsistent between a `--clean` prebuild
 * and a plain sync: MARKETING_VERSION correctly matches app.json's
 * `version` either way, but CURRENT_PROJECT_VERSION only matches app.json's
 * `ios.buildNumber` on a sync — a clean regeneration falls back to Xcode's
 * generic template default ("1") for the main target specifically, while
 * (for reasons equally undocumented) the watch/widget targets end up
 * matching whatever was last set. Rather than depend on that, force both
 * settings to app.json's values directly, uniformly across every target —
 * same proven pattern as the sibling withIosDevTeam plugin. This is what
 * actually keeps the main app and its Watch companion from shipping with
 * different build numbers baked into the same archive.
 */
function withVersionBuildSettings(config) {
  return withXcodeProject(config, (cfg) => {
    const version = config.version || "1.0.0";
    const buildNumber = config.ios?.buildNumber || "1";
    const project = cfg.modResults;
    const configs = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configs)) {
      const buildSettings = configs[key].buildSettings;
      if (!buildSettings) continue;
      buildSettings.MARKETING_VERSION = version;
      buildSettings.CURRENT_PROJECT_VERSION = buildNumber;
    }
    return cfg;
  });
}

module.exports = function withVersionVariables(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.CFBundleShortVersionString = "$(MARKETING_VERSION)";
    cfg.modResults.CFBundleVersion = "$(CURRENT_PROJECT_VERSION)";
    return cfg;
  });
  config = withVersionBuildSettings(config);
  return config;
};

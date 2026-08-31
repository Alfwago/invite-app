const { withXcodeProject } = require("expo/config-plugins");

/**
 * Sets DEVELOPMENT_TEAM on every iOS build config so `expo prebuild --clean`
 * doesn't wipe the signing team (which otherwise has to be re-picked in Xcode
 * every regeneration). Pass the team id: ["./plugins/withIosDevTeam", "XXXXXXXXXX"].
 */
module.exports = function withIosDevTeam(config, teamId) {
  if (!teamId) return config;
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const configs = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configs)) {
      const buildSettings = configs[key].buildSettings;
      if (!buildSettings) continue;
      buildSettings.DEVELOPMENT_TEAM = teamId;
      buildSettings.CODE_SIGN_STYLE = "Automatic";
    }
    return cfg;
  });
};

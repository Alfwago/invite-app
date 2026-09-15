const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "withPodsDeploymentTarget";

// A handful of Pods (ReachabilitySwift, RNSVG's RNSVGFilters resource
// bundle, as of this writing) still ship a stale IPHONEOS_DEPLOYMENT_TARGET
// (12.x) that `react_native_post_install` doesn't reach — current Xcode
// (17.x) only supports iOS 15.0-27.x as a simulator deployment target, so
// any build touching those pods fails outright:
// "The iOS Simulator deployment target 'IPHONEOS_DEPLOYMENT_TARGET' is set
// to 12.0, but the range of supported deployment target versions is 15.0
// to 27.0.x." This isn't the dSYM/prebuilt-binaries tradeoff (deliberately
// left as-is) — it's a separate, plain bug with no downside to fixing, and
// it blocks pod install / builds outright rather than just warning.
//
// Runs as a dangerous mod so it patches ios/Podfile's text after `expo
// prebuild` generates it but before its own `pod install` step reads it.
const INSERT_AFTER = `      :ccache_enabled => ccache_enabled?(podfile_properties),
    )`;

const PATCH = `

    # [${MARKER}] react_native_post_install doesn't reach every synthetic
    # resource-bundle sub-target CocoaPods generates (e.g. RNSVG-RNSVGFilters,
    # ReachabilitySwift-ReachabilitySwift) — those keep whatever old default
    # deployment target their pod shipped with (12.x), which current Xcode's
    # simulator deployment-target range check (15.0+) rejects outright.
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        deployment_target = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if deployment_target && deployment_target.to_f < 15.0
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
      end
    end`;

module.exports = function withPodsDeploymentTarget(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      const contents = fs.readFileSync(podfilePath, "utf8");

      if (contents.includes(MARKER)) return cfg; // already patched

      const idx = contents.indexOf(INSERT_AFTER);
      if (idx === -1) {
        throw new Error(
          "withPodsDeploymentTarget: couldn't find the post_install react_native_post_install(...) " +
            "call in ios/Podfile to patch after — the generated Podfile's shape must have changed; " +
            "update INSERT_AFTER in plugins/withPodsDeploymentTarget.js to match."
        );
      }
      const insertPoint = idx + INSERT_AFTER.length;
      const patched = contents.slice(0, insertPoint) + PATCH + contents.slice(insertPoint);
      fs.writeFileSync(podfilePath, patched);
      return cfg;
    },
  ]);
};

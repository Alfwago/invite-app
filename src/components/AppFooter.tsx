import Constants from "expo-constants";
import { StyleSheet, Text, View } from "react-native";

import { API_BASE } from "@/src/api/client";
import { colors, font, spacing } from "@/src/theme";

const cfg = Constants.expoConfig;
const version = cfg?.version ?? "?";
const build =
  cfg?.ios?.buildNumber ??
  (cfg?.android?.versionCode != null ? String(cfg.android.versionCode) : "?");
const sdk = cfg?.sdkVersion ? `Expo SDK ${cfg.sdkVersion}` : null;

// Only surface the API host while it's not production, so testers can see at a
// glance which stack the build is talking to.
const host = API_BASE.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
const apiHost = host === "invites.falcon83.com" ? null : host;

export function AppFooter() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.line}>OBH Skate Invites</Text>
      <Text style={styles.line}>
        v{version} · build {build}
        {sdk ? ` · ${sdk}` : ""}
      </Text>
      {apiHost ? <Text style={styles.line}>{apiHost}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 2,
    paddingVertical: spacing.lg,
  },
  line: { color: colors.textMuted, fontSize: font.xs },
});

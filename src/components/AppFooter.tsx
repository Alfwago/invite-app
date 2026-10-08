import Constants from "expo-constants";
import { StyleSheet, Text, View } from "react-native";

import { API_BASE } from "@/src/api/client";
import { colors, font, spacing } from "@/src/theme";

// Just the app version. No build number: app.json's iOS buildNumber was
// shown on Android too, and Android's real versionCode is set by EAS at
// build time, so it isn't in the config to show.
const version = Constants.expoConfig?.version ?? "?";

// Only surface the API host while it's not production, so testers can see at a
// glance which stack the build is talking to.
const host = API_BASE.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
const apiHost = host === "invites.falcon83.com" ? null : host;

export function AppFooter() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.line}>OBH Invites v{version}</Text>
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

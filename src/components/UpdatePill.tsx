import { useState } from "react";
import { Linking, Platform, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";

import { API_BASE } from "@/src/api/client";
import { Tap } from "@/src/components/Tap";
import { useAppVersion } from "@/src/hooks/queries";
import { colors, font, radius, spacing } from "@/src/theme";
import { latestForPlatform, shouldShowUpdate } from "@/src/updateCheck";

// Where the pill goes: the App Store listing on iOS; on Android the site's
// direct-APK page (no Play Store listing yet — see android_app /
// android_app_download on the server).
const APP_STORE_URL = "https://apps.apple.com/us/app/obh-invites/id6807978133";
const UPDATE_URL = Platform.OS === "ios" ? APP_STORE_URL : `${API_BASE}/app/`;

// Session-only dismissal: lives in JS memory, so it survives tab switches and
// Home remounts but resets on the next cold start. Holds the dismissed
// version, so a newer one found later in the same session still shows.
let dismissedThisSession: string | null = null;

/**
 * Small gold "App Update ↑ Available" pill at the right end of the Home
 * greeting line. Soft nudge only. The version comes from useAppVersion (the
 * startup/foreground check); `homeLatest` is Home's latest_app_version,
 * used only when the server is too old to have /api/app-version/.
 */
export function UpdatePill({ homeLatest }: { homeLatest?: string }) {
  const { data } = useAppVersion();
  const [dismissed, setDismissed] = useState(dismissedThisSession);
  const installed = Constants.expoConfig?.version ?? "";
  const latest = latestForPlatform(Platform.OS, data, homeLatest);

  if (!shouldShowUpdate(latest, installed, dismissed)) return null;

  function dismiss() {
    dismissedThisSession = latest;
    setDismissed(latest);
  }

  return (
    <View style={styles.pill}>
      <Tap
        onPress={() => Linking.openURL(UPDATE_URL).catch(() => {})}
        hitSlop={6}
        accessibilityRole="link"
        accessibilityLabel={`App update available, version ${latest}`}
        style={styles.main}
      >
        <Text style={styles.text}>App Update ↑ Available</Text>
      </Tap>
      <Tap
        onPress={dismiss}
        // Generous above/below/right; only 4 to the left so it doesn't eat
        // taps meant for the pill text.
        hitSlop={{ top: 12, bottom: 12, right: 12, left: 4 }}
        accessibilityRole="button"
        accessibilityLabel="Dismiss update notice"
        style={styles.close}
      >
        <Ionicons name="close" size={14} color={colors.goldText} />
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  main: { paddingVertical: spacing.xs },
  text: { color: colors.goldText, fontSize: font.xs, fontWeight: "800" },
  close: { marginLeft: spacing.xs, padding: 2 },
});

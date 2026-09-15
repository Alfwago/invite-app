import { useEffect, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";

import { API_BASE } from "@/src/api/client";
import { colors, font, radius, spacing } from "@/src/theme";
import { isNewerVersion } from "@/src/version";

const DISMISSED_KEY = "obh.dismissedAppVersion";

// Android's only live distribution today is the direct-APK page (no Play
// Store listing yet) — see android_app / android_app_download on the
// server. iOS has no public App Store URL yet, so there's nothing to link
// to there; the banner still informs, it just has no button. Once either
// store listing goes live, point this at it instead.
const UPDATE_URL = Platform.OS === "android" ? `${API_BASE}/app/` : null;

/**
 * Soft, dismissible nudge — informational only, no enforcement. Shown when
 * SiteConfiguration.latest_app_version (relayed via /api/home/) is newer
 * than the installed build. Dismissal is per-version, not forever: it
 * stores the dismissed version string (not a plain yes/no) in SecureStore,
 * so a later, further version bump shows the banner again — see
 * isNewerVersion. `latestVersion` is HomeData.latest_app_version ("" means
 * nothing configured, i.e. never show).
 */
export function UpdateBanner({ latestVersion }: { latestVersion: string }) {
  const installed = Constants.expoConfig?.version ?? "";
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(DISMISSED_KEY)
      .then(setDismissed)
      .catch(() => setDismissed(null))
      .finally(() => setLoaded(true));
  }, []);

  const shouldShow =
    loaded && isNewerVersion(latestVersion, installed) && latestVersion !== dismissed;
  if (!shouldShow) return null;

  function dismiss() {
    setDismissed(latestVersion);
    SecureStore.setItemAsync(DISMISSED_KEY, latestVersion).catch(() => {});
  }

  return (
    <View style={styles.box}>
      <View style={styles.row}>
        <Text style={styles.title}>Update available</Text>
        <Pressable onPress={dismiss} hitSlop={8} accessibilityLabel="Dismiss">
          <Ionicons name="close" size={18} color={colors.blue} />
        </Pressable>
      </View>
      <Text style={styles.body}>A newer version of the app is available.</Text>
      {UPDATE_URL ? (
        <Pressable
          onPress={() => Linking.openURL(UPDATE_URL).catch(() => {})}
          style={styles.updateBtn}
        >
          <Text style={styles.updateBtnText}>Update</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.blueDim,
    borderColor: colors.blue,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.blue, fontSize: font.md, fontWeight: "800" },
  body: { color: colors.text, fontSize: font.sm, lineHeight: 19 },
  updateBtn: {
    alignSelf: "flex-start",
    borderColor: colors.blue,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  updateBtnText: { color: colors.blue, fontSize: font.sm, fontWeight: "700" },
});

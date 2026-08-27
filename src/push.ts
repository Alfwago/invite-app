import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { apiFetch } from "@/src/api/client";

// How notifications behave while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let registeredToken: string | null = null;

function projectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    // @ts-expect-error easConfig isn't in the types but is populated in builds
    Constants.easConfig?.projectId
  );
}

/**
 * Ask permission, fetch the Expo push token, and register it with the server.
 * Silently no-ops on a simulator, when permission is denied, or in Expo Go
 * without an EAS project id (remote push needs a development build on SDK 53).
 */
export async function registerForPush(): Promise<void> {
  try {
    if (!Device.isDevice) return;

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const id = projectId();
    if (!id) {
      console.warn("[push] no EAS projectId — run `eas init` and use a dev build to enable push");
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    if (!token || token === registeredToken) return;

    await apiFetch("/api/push/register/", {
      method: "POST",
      body: { token, platform: Platform.OS },
    });
    registeredToken = token;
  } catch (e) {
    console.warn("[push] registration failed:", e);
  }
}

export async function unregisterForPush(): Promise<void> {
  try {
    if (registeredToken) {
      await apiFetch("/api/push/unregister/", {
        method: "POST",
        body: { token: registeredToken },
      });
    }
  } catch {
    // best-effort
  } finally {
    registeredToken = null;
  }
}

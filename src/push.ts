import Constants from "expo-constants";
import { Platform } from "react-native";

import { apiFetch } from "@/src/api/client";

/**
 * expo-notifications' remote-push native modules (ExpoPushTokenManager) and
 * expo-device were removed from / are unavailable in Expo Go as of SDK 53+.
 * Importing those packages at module scope crashes the whole app in Expo Go, so
 * everything here stays behind this flag and uses lazy `require()`.
 *
 * Push works in a development / production build, not in Expo Go.
 */
export const pushSupported =
  Platform.OS !== "web" &&
  Constants.appOwnership !== "expo" &&
  Constants.executionEnvironment !== "storeClient";

// How notifications behave while the app is foregrounded.
if (pushSupported) {
  try {
    require("expo-notifications").setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch {
    // native module not present — ignore
  }
}

/**
 * Android notification channels. Invites go to a MAX-importance channel so
 * they arrive as a heads-up banner, make a sound, and sit in the shade until
 * the user acts on them — the way a text message does. Other pushes use a
 * HIGH-importance "default" channel. Channels must exist before the first
 * notification arrives and their importance can't be lowered later, so we
 * (re)create them every launch on Android.
 */
export async function configureAndroidChannels(): Promise<void> {
  if (!pushSupported || Platform.OS !== "android") return;
  try {
    const Notifications = require("expo-notifications");
    const { AndroidImportance, AndroidNotificationVisibility } = Notifications;

    await Notifications.setNotificationChannelAsync("skate-invites", {
      name: "Skate invites",
      description: "When you're invited to a skate",
      importance: AndroidImportance.MAX,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync("default", {
      name: "General",
      importance: AndroidImportance.HIGH,
      sound: "default",
      showBadge: true,
    });
  } catch {
    // native module not present — ignore
  }
}

let registeredToken: string | null = null;

/** Set the app-icon badge number. No-op on web / in Expo Go / on failure. */
export async function setAppBadge(count: number): Promise<void> {
  if (!pushSupported) return;
  try {
    await require("expo-notifications").setBadgeCountAsync(Math.max(0, count));
  } catch {
    // native module not present — ignore
  }
}

function projectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    // easConfig isn't in the types but is populated in builds
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

/**
 * Ask permission, fetch the Expo push token, and register it with the server.
 * No-ops in Expo Go / on web / on a simulator / when permission is denied.
 */
export async function registerForPush(): Promise<void> {
  if (!pushSupported) return;
  try {
    const Device = require("expo-device");
    const Notifications = require("expo-notifications");

    if (!Device.isDevice) return;

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return;

    await configureAndroidChannels();

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

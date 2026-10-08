import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

import { shouldBuzz } from "@/src/hapticsPref";

// Tap/success/error haptics. Fire-and-forget: a build without the native
// module (or web, or a simulator — which has no haptics at all) just does
// nothing, and a failure never reaches the caller. Every one is skipped when
// the player has switched off "Vibration on tap" (Profile; hapticsPref.ts).

function safe(fn: () => Promise<void>) {
  if (!shouldBuzz(Platform.OS)) return;
  try {
    fn().catch(() => {});
  } catch {
    // native module missing — no-op
  }
}

/** A light tap on pressing a main action button. */
export function tapHaptic() {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** A selection tick — segmented controls and on/off toggles. */
export function selectHaptic() {
  safe(() => Haptics.selectionAsync());
}

/** An action finished. */
export function successHaptic() {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** An action failed. */
export function errorHaptic() {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

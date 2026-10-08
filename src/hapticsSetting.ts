import { useSyncExternalStore } from "react";
import * as SecureStore from "expo-secure-store";

import {
  HAPTICS_PREF_KEY,
  hapticsEnabled,
  parseHapticsPref,
  serializeHapticsPref,
  setHapticsEnabled,
  subscribeHapticsPref,
} from "@/src/hapticsPref";

// Loads/saves the "Vibration on tap" setting on this device. The gate itself
// is in hapticsPref.ts (read by src/haptics.ts on every buzz).

/** Read the saved setting. Called once at startup (app/_layout.tsx); until it
 *  resolves, haptics stay on (the default). */
export async function loadHapticsPref() {
  try {
    setHapticsEnabled(parseHapticsPref(await SecureStore.getItemAsync(HAPTICS_PREF_KEY)));
  } catch {
    // no secure store (web) or unreadable — keep the default
  }
}

/** Apply at once, then persist. A failed save still applies for this run. */
export async function saveHapticsPref(on: boolean) {
  setHapticsEnabled(on);
  try {
    await SecureStore.setItemAsync(HAPTICS_PREF_KEY, serializeHapticsPref(on));
  } catch {
    // ignore — the in-memory setting already changed
  }
}

/** The current setting, re-rendering when it changes. */
export function useHapticsPref(): boolean {
  return useSyncExternalStore(subscribeHapticsPref, hapticsEnabled);
}

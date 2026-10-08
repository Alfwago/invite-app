// The "Vibration on tap" setting (Profile → App settings). Per device, not
// per account: it lives in this phone's secure store (src/hapticsSetting.ts
// loads and saves it), never on the server. Pure module — no React Native
// imports — so the gate is unit-testable.

/** Secure-store key. Absent = never set = on. */
export const HAPTICS_PREF_KEY = "obh.hapticsOnTap";

let enabled = true;
const listeners = new Set<(on: boolean) => void>();

/** Stored value → setting. Anything but an explicit "off" is on, so a
 *  missing or garbled value never silences the phone by surprise. */
export function parseHapticsPref(raw: string | null | undefined): boolean {
  return raw !== "off";
}

export function serializeHapticsPref(on: boolean): string {
  return on ? "on" : "off";
}

export function hapticsEnabled(): boolean {
  return enabled;
}

export function setHapticsEnabled(on: boolean) {
  if (on === enabled) return;
  enabled = on;
  for (const fn of listeners) fn(on);
}

/** For useSyncExternalStore. Returns the unsubscribe. */
export function subscribeHapticsPref(fn: (on: boolean) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Whether a haptic should fire: never on web, never with the setting off. */
export function shouldBuzz(platformOS: string): boolean {
  return platformOS !== "web" && enabled;
}

import Constants from "expo-constants";
import { Platform } from "react-native";

// Same constraint as src/push.ts: the native module isn't present in Expo
// Go, so everything here stays behind this flag and reaches the native
// side only via a lazy require() inside try/catch.
export const watchConnectivitySupported =
  Platform.OS === "ios" &&
  Constants.appOwnership !== "expo" &&
  Constants.executionEnvironment !== "storeClient";

export type WatchRsvpStatus = "YES" | "NO" | "MAYBE";

export type RsvpRequestEvent = {
  requestId: string;
  eventId: number;
  status: WatchRsvpStatus;
};

type ReachabilityEvent = { reachable: boolean };

type Subscription = { remove: () => void };

interface NativeWatchConnectivity {
  isSupported(): boolean;
  isReachable(): boolean;
  updateApplicationContext(payload: Record<string, unknown>): void;
  respondToRsvpRequest(requestId: string, success: boolean, message?: string): void;
  addListener(eventName: string, listener: (event: unknown) => void): Subscription;
}

let cached: NativeWatchConnectivity | null | undefined;

function nativeModule(): NativeWatchConnectivity | null {
  if (!watchConnectivitySupported) return null;
  if (cached !== undefined) return cached;
  try {
    const core = require("expo-modules-core");
    cached = core.requireNativeModule("ExpoWatchConnectivity") as NativeWatchConnectivity;
  } catch (e) {
    console.warn("[watch] native module unavailable:", e);
    cached = null;
  }
  return cached ?? null;
}

/** Fires when the watch taps Yes/No/Maybe. Reply with `respondToRsvpRequest`. */
export function addRsvpRequestListener(listener: (event: RsvpRequestEvent) => void): Subscription {
  return nativeModule()?.addListener("onRsvpRequest", listener as (e: unknown) => void) ?? { remove() {} };
}

export function addReachabilityListener(listener: (event: ReachabilityEvent) => void): Subscription {
  return nativeModule()?.addListener("onReachabilityChange", listener as (e: unknown) => void) ?? { remove() {} };
}

/** Completes the watch's tap after `submitRsvp` (or a rejection) resolves. */
export function respondToRsvpRequest(requestId: string, success: boolean, message?: string): void {
  nativeModule()?.respondToRsvpRequest(requestId, success, message);
}

/** Pushes next-skate/RSVP/jersey to the watch. No-op off iOS / in Expo Go. */
export function updateWatchApplicationContext(payload: Record<string, unknown>): void {
  nativeModule()?.updateApplicationContext(payload);
}

export function isWatchReachable(): boolean {
  return nativeModule()?.isReachable() ?? false;
}

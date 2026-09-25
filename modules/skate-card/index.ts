import Constants from "expo-constants";
import { Platform } from "react-native";

// Same constraint as modules/watch-connectivity: the native module isn't in
// Expo Go, so it's reached only via a lazy require() inside try/catch.
export const skateCardSupported =
  Platform.OS === "ios" &&
  Constants.appOwnership !== "expo" &&
  Constants.executionEnvironment !== "storeClient";

/** Mirrors SkateCardInput in ios/SkateCardModule.swift. */
export type SkateCardInput = {
  eventId: number;
  name: string;
  /** Puck drop, Unix seconds. */
  startsAt: number;
  /** Bundled night logo key ("Monday"); "" = default. */
  logo?: string;
  /** The viewer's RSVP status. */
  myStatus?: string;
  skaters: number;
  goalies: number;
  capacity?: number;
  goaliesNeeded?: number;
  team?: string;
  jersey?: string;
  /** The night board's newest post from the last 24h, if any. */
  messageAuthor?: string;
  messageText?: string;
  /** Unix seconds. */
  messageAt?: number;
};

interface NativeSkateCard {
  isSupported(): boolean;
  setServer(apiUrl: string, authToken: string): void;
  show(input: SkateCardInput): Promise<void>;
  end(eventId: number): Promise<void>;
  signOut(): Promise<void>;
}

let cached: NativeSkateCard | null | undefined;

function nativeModule(): NativeSkateCard | null {
  if (!skateCardSupported) return null;
  if (cached !== undefined) return cached;
  try {
    const core = require("expo-modules-core");
    cached = core.requireNativeModule("SkateCard") as NativeSkateCard;
  } catch (e) {
    console.warn("[skate-card] native module unavailable:", e);
    cached = null;
  }
  return cached ?? null;
}

/** Hands the native side what it needs to report card tokens on its own. */
export function setSkateCardServer(apiUrl: string, authToken: string): void {
  nativeModule()?.setServer(apiUrl, authToken);
}

/** Starts the card for this skate, or updates it if it's already up. */
export async function showSkateCard(input: SkateCardInput): Promise<void> {
  await nativeModule()?.show(input);
}

export async function endSkateCard(eventId: number): Promise<void> {
  await nativeModule()?.end(eventId);
}

/** Unregisters this device's card tokens and takes any card down. Call
 *  while the auth token is still valid. */
export async function skateCardSignOut(): Promise<void> {
  try {
    await nativeModule()?.signOut();
  } catch {
    // best-effort
  }
}

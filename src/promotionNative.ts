// The device side of the promotion notification's buttons (app 1.7.1, owner
// 4h C). The decisions live in src/promotion.ts (unit-tested); this file only
// talks to expo-notifications, secure storage and the network.
//
// Both buttons open the app. expo-notifications (SDK 54) only delivers a
// button press to JS when the action foregrounds the app — with
// `opensAppToForeground: false` a press on a killed app never reaches the
// listener on iOS, and Android needs a headless expo-task-manager task. So
// "Confirm" opens the app briefly, confirms straight away with the saved
// login, and lands on the skate showing the result; "Can't make it" opens the
// skate's card and never declines by itself.

import * as SecureStore from "expo-secure-store";

import { API_BASE } from "@/src/api/client";
import { TOKEN_KEY } from "@/src/auth/AuthContext";
import { pushSupported } from "@/src/push";
import {
  ACTION_CONFIRM,
  ACTION_DECLINE,
  type ActionDeps,
  type ConfirmResult,
  CONFIRM_LABEL,
  DECLINE_LABEL,
  FAILURE_BODY,
  FAILURE_TITLE,
  PROMOTION_CATEGORY,
} from "@/src/promotion";

/** Register the "promotion" category (Confirm / Can't make it). Safe to call
 *  every launch; no-op where push isn't supported. */
export async function registerPromotionCategory(): Promise<void> {
  if (!pushSupported) return;
  try {
    await require("expo-notifications").setNotificationCategoryAsync(PROMOTION_CATEGORY, [
      { identifier: ACTION_CONFIRM, buttonTitle: CONFIRM_LABEL, options: { opensAppToForeground: true } },
      { identifier: ACTION_DECLINE, buttonTitle: DECLINE_LABEL, options: { opensAppToForeground: true } },
    ]);
  } catch {
    // native module not present — the push still shows, without buttons
  }
}

async function postConfirm(eventId: string, token: string): Promise<ConfirmResult> {
  try {
    const res = await fetch(`${API_BASE}/api/events/${eventId}/promotion/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ action: "confirm" }),
    });
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    return { kind: "http", status: res.status, body };
  } catch {
    return { kind: "network" };
  }
}

async function notifyFailure(eventId: string): Promise<void> {
  if (!pushSupported) return;
  await require("expo-notifications").scheduleNotificationAsync({
    content: {
      title: FAILURE_TITLE,
      body: FAILURE_BODY,
      // Tapping it opens the skate (any data.eventId does).
      data: { type: "promotion_failed", eventId: Number(eventId) || eventId },
    },
    trigger: null,
  });
}

// Shared across remounts: the same response can arrive from the live
// listener and from getLastNotificationResponseAsync on launch.
const seen = new Set<string>();

export const promotionDeps: ActionDeps = {
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  postConfirm,
  notifyFailure,
  seen,
};

/** Forget the handled response so a later launch doesn't replay it. */
export async function clearHandledResponse(): Promise<void> {
  if (!pushSupported) return;
  try {
    await require("expo-notifications").clearLastNotificationResponseAsync();
  } catch {
    // older native module — the in-memory `seen` set still guards this run
  }
}

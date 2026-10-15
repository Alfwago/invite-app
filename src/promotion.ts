// Waitlist promotion "Can you make it?" (server 0.36.0 / app 1.7.1) — pure
// logic, no React Native imports, so it runs under `npm test`.
//
// Owner 2026-10-15: a player promoted off the waitlist answers with two
// buttons, "Confirm" / "Can't make it" (owner's final wording), on the event
// (instead of the RSVP buttons), on Home, and on the push itself (4h C):
//   - Confirm on the notification confirms the spot. The app does it with the
//     stored token; on ANY failure it posts a local notification "Couldn't
//     confirm your spot — tap to open" so nobody believes it worked when it
//     didn't.
//   - Can't make it on the notification only OPENS the event card — giving up
//     the spot is never done from the lock screen.
// The push carries data {type: "waitlist_promoted", action:
// "confirm_promotion", eventId} and Expo categoryId "promotion".

/** Button wording — one place to change it (the server has its own copy in
 *  invitations/promotion.py for email / web). */
export const CONFIRM_LABEL = "Confirm";
export const DECLINE_LABEL = "Can't make it";

/** Notification category + action ids registered with expo-notifications. */
export const PROMOTION_CATEGORY = "promotion";
export const ACTION_CONFIRM = "promotion-confirm";
export const ACTION_DECLINE = "promotion-decline";

export const FAILURE_TITLE = "Couldn't confirm your spot — tap to open";
export const FAILURE_BODY = "Open the skate and tap Confirm to keep your spot.";

export type PushData = {
  type?: string;
  action?: string;
  eventId?: number | string;
} | null | undefined;

export function isPromotionPush(data: PushData): boolean {
  return !!data && (data.type === "waitlist_promoted" || data.action === "confirm_promotion");
}

/** The confirm call's result as the handler sees it. `body` is the parsed
 *  JSON when there was one. */
export type ConfirmResult =
  | { kind: "http"; status: number; body?: unknown }
  | { kind: "network" };

/**
 * Did Confirm actually leave them confirmed? 200 = yes. A 409 whose event
 * says they're a Yes with nothing pending = they'd already confirmed (e.g. on
 * the website) — also yes. Everything else (401 expired login, 409 "nothing
 * to answer" because they're off the roster, 5xx, offline) = no.
 */
export function confirmSucceeded(r: ConfirmResult): boolean {
  if (r.kind !== "http") return false;
  if (r.status >= 200 && r.status < 300) return true;
  if (r.status === 409) {
    const rsvp = (r.body as { my_rsvp?: { status?: string; promotion?: unknown } } | undefined)
      ?.my_rsvp;
    return !!rsvp && rsvp.status === "YES" && !rsvp.promotion;
  }
  return false;
}

export type ActionOutcome = "ignored" | "open" | "confirmed" | "failed" | "duplicate";

export interface ActionDeps {
  /** The saved login token, read straight from secure storage (the app may
   *  have been launched by the button press, before sign-in state loads). */
  getToken: () => Promise<string | null>;
  /** POST /api/events/<id>/promotion/ {action: "confirm"} with that token. */
  postConfirm: (eventId: string, token: string) => Promise<ConfirmResult>;
  /** Post the local "Couldn't confirm your spot — tap to open" notification. */
  notifyFailure: (eventId: string) => Promise<void>;
  /** Response ids already handled (the OS can hand the same one over twice:
   *  the live listener and getLastNotificationResponseAsync on launch). */
  seen: Set<string>;
}

export interface ActionResponse {
  /** expo-notifications `actionIdentifier`. */
  actionIdentifier: string;
  /** The notification's request identifier. */
  notificationId: string;
  data: PushData;
}

/**
 * Handle a tap on a promotion push. Returns what happened; the caller opens
 * the event for "open" / "confirmed" / "failed" and shows a toast.
 * Non-promotion pushes return "ignored" (normal tap routing applies).
 */
export async function handlePromotionResponse(
  resp: ActionResponse,
  deps: ActionDeps,
): Promise<ActionOutcome> {
  if (!isPromotionPush(resp.data) || resp.data?.eventId == null) return "ignored";
  const eventId = String(resp.data.eventId);
  if (resp.actionIdentifier !== ACTION_CONFIRM) return "open"; // tap or Can't make it
  const key = `${resp.notificationId}:${resp.actionIdentifier}`;
  if (deps.seen.has(key)) return "duplicate";
  deps.seen.add(key);

  let ok = false;
  try {
    const token = await deps.getToken();
    if (token) ok = confirmSucceeded(await deps.postConfirm(eventId, token));
  } catch {
    ok = false;
  }
  if (!ok) {
    try {
      await deps.notifyFailure(eventId);
    } catch {
      // The caller still opens the event, where the card is waiting.
    }
    return "failed";
  }
  return "confirmed";
}

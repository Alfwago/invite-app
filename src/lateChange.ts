// Pure logic for the "you're changing within N hours" RSVP confirm — no
// React Native imports, so it runs under `npm test`. Used by RsvpControls.
//
// The server (0.34.3+) sends `my_rsvp.late_change` = the late-change window
// and whether a drop would owe the fee (its roster pay rule: goalies, the
// night's director, comped and borrowed players owe nothing). An older
// server doesn't, so fall back to what the app can see: the director-only
// `manage.rsvp_change_warning_hours` and "goalies don't pay".

import type { LateChange, MyRsvp } from "./api/types.ts";

export const LATE_CHANGE_FEE = "$20";

/** Same words as the website's warning (server 0.34.3). */
export function lateChangeMessage(hours: number, fee: boolean, feeAmount = LATE_CHANGE_FEE): string {
  const h = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return (
    `You're changing within ${h} hour${hours === 1 ? "" : "s"} of the skate.` +
    (fee ? ` You'll still owe the ${feeAmount} late-change fee.` : "")
  );
}

/** "2026-10-14" + "19:30:00" → that moment on this phone's clock, or null. */
export function localStart(date: string | undefined, startTime: string | null | undefined): Date | null {
  if (!date || !startTime) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = startTime.split(":").map(Number);
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return null;
  return new Date(y, m - 1, d, hh, mm);
}

/**
 * The confirm text when changing `current` (a Yes) to `choice` now is a
 * late change, else null.
 *  - Only Yes → No / Maybe.
 *  - `current.late_change` (server 0.34.3+) decides: null there = no window
 *    for this player (not Yes, none set, borrowed, Acting ND).
 *  - Older server: `fallbackHours` (director-only manage field) + the
 *    event's start; fee unless they're in as a goalie. Without hours, no
 *    confirm.
 */
export function lateChangeWarning(args: {
  current: MyRsvp | null | undefined;
  choice: string;
  now: Date;
  fallbackHours?: number | null;
  date?: string;
  startTime?: string | null;
}): string | null {
  const { current, choice, now } = args;
  if (!current || current.status !== "YES" || choice === "YES") return null;

  let window: { start: Date; end: Date; hours: number; fee: boolean; amount?: string } | null = null;
  if (current.late_change !== undefined) {
    const lc: LateChange | null = current.late_change;
    if (!lc) return null;
    window = {
      start: new Date(lc.window_start),
      end: new Date(lc.starts_at),
      hours: lc.hours,
      fee: lc.fee,
      amount: lc.fee_amount,
    };
  } else {
    const hours = args.fallbackHours;
    const end = localStart(args.date, args.startTime);
    if (!hours || hours <= 0 || !end) return null;
    window = {
      start: new Date(end.getTime() - hours * 3600 * 1000),
      end,
      hours,
      fee: !current.is_goalie,
    };
  }
  const t = now.getTime();
  if (Number.isNaN(window.start.getTime()) || t < window.start.getTime() || t > window.end.getTime()) {
    return null;
  }
  return lateChangeMessage(window.hours, window.fee, window.amount || LATE_CHANGE_FEE);
}

/**
 * A late dropper switching No ↔ Maybe (owner, 2026-10-14): the server's
 * note "You still owe the $X late-change fee — only changing back to Yes
 * clears it.", else null. Only when the server says they owe
 * (`my_rsvp.late_drop_owed`, 0.35.0+ — fines on, not exempt); an older
 * server never sends it, so no note.
 */
export function lateDropOwedNote(args: {
  current: MyRsvp | null | undefined;
  choice: string;
}): string | null {
  const { current, choice } = args;
  if (!current || current.status === "YES" || choice === "YES" || choice === current.status) {
    return null;
  }
  return current.late_drop_owed?.message || null;
}

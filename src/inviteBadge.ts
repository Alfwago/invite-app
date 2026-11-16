// Pure logic, no React Native imports, so it runs under `npm test`.
import type { EventSummary, MyRsvp } from "./api/types.ts";
import { localStart } from "./lateChange.ts";

/** The player hasn't acted on this invite yet. The server seeds a fresh
 *  invite's status as NO (so an ignored invite plans as "not coming"), so
 *  `status` alone reads as an answer: `responded_at` is the real signal
 *  (same as the server's `pending_invite_count`). Owner 2026-11-16: an
 *  unanswered invite showed "NOT GOING" while the icon badge said 1. */
export function isUnanswered(rsvp: MyRsvp | null | undefined): boolean {
  return rsvp != null && rsvp.responded_at == null;
}

type Timed = Pick<EventSummary, "date" | "start_time" | "is_past">;

/** The skate has happened: its start time has passed (local time), or, with
 *  no start time, its day is over. `is_past` (server archived it) counts too. */
export function eventStarted(event: Timed, now: Date = new Date()): boolean {
  if (event.is_past) return true;
  const start = localStart(event.date, event.start_time);
  if (start) return start <= now;
  const [y, m, d] = event.date.split("-").map(Number);
  return new Date(y, m - 1, d + 1) <= now;
}

/** Invites counted on the app-icon badge: open, unanswered, and not started
 *  yet. Once a skate happens it drops off, answered or not (owner 2026-11-16). */
export function pendingInviteCount(
  events: Pick<EventSummary, "status" | "my_rsvp" | "date" | "start_time" | "is_past">[],
  now: Date = new Date(),
): number {
  return events.filter((e) => e.status === "OPEN" && isUnanswered(e.my_rsvp) && !eventStarted(e, now)).length;
}

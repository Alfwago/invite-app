// Pure logic for the Late Scratches board (server 0.36.0 build 97) — no React
// Native imports, so it runs under `npm test`.
//
// A late drop is private to the directors until one of them posts it
// (owner, 2026-10-16). Posted late drops come back on EventDetail as
// `late_scratches[]` (never any money) and the dropper gets
// `my_late_scratch: {on_board: true}`. Director roster rows carry
// `late_drop_posted`. An older server sends none of these keys, so the card
// and the Post control simply don't show.

import type { EventDetail, RosterEntry, RsvpStatus } from "./api/types.ts";

export const LATE_SCRATCHES_TITLE = "Late Scratches";

/** The board's lines; [] on an older server. */
export function lateScratchRows(event: Pick<EventDetail, "late_scratches">) {
  return event.late_scratches ?? [];
}

/** "No" / "Maybe" / "Waitlisted" for a board line. */
export function lateScratchStatus(status: RsvpStatus): string {
  if (status === "MAYBE") return "Maybe";
  if (status === "WAITLIST") return "Waitlisted";
  return "No";
}

export interface LateScratchControl {
  posted: boolean;
  /** "On Late Scratches" / "Not posted" */
  tag: string;
  /** "Un-post" / "Post to board" */
  button: string;
}

/**
 * Manage → Roster's Post / Un-post on a Late Drop row. null when the server
 * is too old to know about the board (no `late_drop_posted`) or the skate is
 * over (the board is hidden once archived).
 */
export function lateScratchControl(p: RosterEntry, isPast: boolean): LateScratchControl | null {
  if (isPast || typeof p.late_drop_posted !== "boolean") return null;
  return p.late_drop_posted
    ? { posted: true, tag: "On Late Scratches", button: "Un-post" }
    : { posted: false, tag: "Not posted", button: "Post to board" };
}

/** The confirm before posting — same words as the website. */
export function postConfirmCopy(name: string): { title: string; body: string; button: string } {
  return {
    title: `Post ${name} to ${LATE_SCRATCHES_TITLE}?`,
    body:
      "Everyone invited to this skate will see the late drop and can chirp them. " +
      "They get a notification. No money is shown.",
    button: "Post",
  };
}

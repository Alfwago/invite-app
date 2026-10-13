// Pure logic for Manage → Roster's "Late drops" list — no React Native
// imports, so it runs under `npm test`.
//
// Server 0.34.3+ sends, on each director-view roster row that dropped late,
// `late_drop_at` + `late_drop_label` ("6:15 PM (2h 24m before)"). Server
// 0.35.0+ adds `late_fine`: "owes" (Fine switch on), "waived" (off) or
// "none" (exempt). Older servers send neither, so nothing shows.

import type { LateFine, RosterEntry } from "./api/types.ts";

/** Rows that dropped late (No / Maybe with `late_drop_at`), in roster order. */
export function lateDropRows(players: RosterEntry[]): RosterEntry[] {
  return players.filter((p) => !!p.late_drop_at && p.status !== "YES");
}

/** "Late drop · 6:15 PM (2h 24m before) · No" + " · fine waived" / " · no fee". */
export function lateDropLine(p: RosterEntry): string {
  const parts = ["Late drop"];
  if (p.late_drop_label) parts.push(p.late_drop_label);
  parts.push(p.status === "MAYBE" ? "Maybe" : "No");
  if (p.late_fine === "waived") parts.push("fine waived");
  else if (p.late_fine === "none") parts.push("no fee");
  return parts.join(" · ");
}

/**
 * What goes next to the row: the Fine switch ("switch", on = owes),
 * "exempt" (muted "no fee", no switch) or "hidden" (server too old to know).
 */
export function fineControl(p: RosterEntry): "switch" | "exempt" | "hidden" {
  if (p.late_fine === "owes" || p.late_fine === "waived") return "switch";
  if (p.late_fine === "none") return "exempt";
  return "hidden";
}

/** The row after flipping its Fine switch (the optimistic copy). */
export function withLateFine(p: RosterEntry, fine: boolean): RosterEntry {
  if (fineControl(p) !== "switch") return p;
  const late_fine: LateFine = fine ? "owes" : "waived";
  return { ...p, late_fine, pays: fine };
}

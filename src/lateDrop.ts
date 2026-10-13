// Pure logic for Manage → Roster's "Late drops" list — no React Native
// imports, so it runs under `npm test`.
//
// Server 0.34.3+ sends, on each director-view roster row that dropped late,
// `late_drop_at` + `late_drop_label` ("6:15 PM (2h 24m before)"). Server
// 0.35.0+ adds `late_fine`: "owes" (the skate's price), "waived" (the
// event's Settings → "Fine late drops" is off) or "none" (exempt), and
// `manage.skate_fee`. Older servers send neither, so nothing shows. Fines
// are switched on/off for the whole skate in Settings, not per row.

import type { RosterEntry } from "./api/types.ts";

/** Rows that dropped late (No / Maybe with `late_drop_at`), in roster order. */
export function lateDropRows(players: RosterEntry[]): RosterEntry[] {
  return players.filter((p) => !!p.late_drop_at && p.status !== "YES");
}

/** "Late drop · 6:15 PM (2h 24m before) · No" + " · no fine" / " · no fee". */
export function lateDropLine(p: RosterEntry): string {
  const parts = ["Late drop"];
  if (p.late_drop_label) parts.push(p.late_drop_label);
  parts.push(p.status === "MAYBE" ? "Maybe" : "No");
  if (p.late_fine === "waived") parts.push("no fine");
  else if (p.late_fine === "none") parts.push("no fee");
  return parts.join(" · ");
}

/**
 * The red label next to a row that owes: "Fine $25" (the skate's price from
 * `manage.skate_fee`; "Fine" alone if the server didn't send one), else null.
 */
export function fineBadge(p: RosterEntry, skateFee: number | null | undefined): string | null {
  if (p.late_fine !== "owes") return null;
  return typeof skateFee === "number" ? `Fine $${skateFee}` : "Fine";
}

/**
 * Settings → "Fine late drops" + "Skate fee" for the PATCH body — only the
 * fields this server knows (0.35.0+ sends `manage.fine_late_drops` /
 * `manage.skate_fee`); an older server gets neither, and the app hides both.
 */
export function fineSettingsPatch(
  manage: { fine_late_drops?: boolean; skate_fee?: number },
  fine: boolean,
  fee: string,
): { fine_late_drops?: boolean; skate_fee?: number } {
  const out: { fine_late_drops?: boolean; skate_fee?: number } = {};
  if (typeof manage.fine_late_drops === "boolean") out.fine_late_drops = fine;
  if (typeof manage.skate_fee === "number" && /^\d+$/.test(fee.trim())) out.skate_fee = Number(fee.trim());
  return out;
}

import type { RosterStats } from "@/src/api/types";
import type { BadgeTone } from "@/src/components/ui";

export type Health = "good" | "caution" | "bad";

/** False for a non-skating event (party, golf outing — server 0.40.0+).
 *  Missing (older servers) = a skate. */
export function isSkating(r: Pick<RosterStats, "is_skating">): boolean {
  return r.is_skating !== false;
}

/** Open spots — a party's from spots_open, a skate's from skater_spots_open. */
export function spotsOpen(r: RosterStats): number | null {
  return isSkating(r) ? r.skater_spots_open : (r.spots_open ?? null);
}

/**
 * One green / amber / red read on a roster.
 *  - needing goalies is ALWAYS bad (red)
 *  - a full roster is good (green)
 *  - playable but not full is caution (amber)
 */
export function rosterHealth(r: RosterStats): Health {
  // A party is never short of anything (owner 2026-10-27).
  if (!isSkating(r)) return "good";
  if (r.goalie_spots_open != null && r.goalie_spots_open > 0) return "bad";
  if (r.is_full) return "good";
  if (r.skater_spots_open != null && r.skater_spots_open > 0) return "caution";
  return "good";
}

/** Skater fill as a percentage, or null when capacity is unknown. */
export function fillPct(r: RosterStats): number | null {
  if (r.capacity == null || r.capacity === 0) return null;
  return (r.skaters / r.capacity) * 100;
}

/** Short status pills for a roster — "FULL" / "NEED SKATERS" / "NEED GOALIES".
 *  A non-skating event only ever gets FULL. */
export function rosterBadges(r: RosterStats): { label: string; tone: BadgeTone }[] {
  const out: { label: string; tone: BadgeTone }[] = [];
  if (!isSkating(r)) return r.is_full ? [{ label: "FULL", tone: "good" }] : [];
  if (r.is_full) out.push({ label: "FULL", tone: "good" });
  else if (r.skater_spots_open != null && r.skater_spots_open > 0)
    out.push({ label: "NEED SKATERS", tone: "caution" });
  if (r.goalie_spots_open != null && r.goalie_spots_open > 0)
    out.push({ label: "NEED GOALIES", tone: "bad" });
  return out;
}

// What changed between two team assignments ({playerKey: "Gold" | "Black"}),
// for the team generator's "Teams balanced: 4 players moved" toast and the
// brief highlight on the moved rows.

type Assignment = Record<string, string>;

/**
 * Keys on a team in both assignments whose team differs. Players only in
 * one of them (newly added, filtered out by Present only, or sitting in a
 * goalie slot) didn't "move", so they aren't counted.
 */
export function movedIds(prev: Assignment, next: Assignment): string[] {
  return Object.keys(next).filter((k) => prev[k] != null && prev[k] !== next[k]);
}

/** Toast text after Auto-balance. `hadTeams` = there were teams before. */
export function balanceMessage(hadTeams: boolean, moved: number): string {
  if (!hadTeams) return "Teams balanced";
  if (moved === 0) return "Teams balanced: no one moved";
  return `Teams balanced: ${moved} player${moved === 1 ? "" : "s"} moved`;
}

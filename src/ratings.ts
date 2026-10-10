// Display rules for player ratings (server: invite-server invitations/ratings.py).
// Ratings are per night; 0.00 = "Not Rated". The Global Score comes from the
// player's rated nights (1 → that PPV, 2 → average, 3+ → average of highest
// and lowest) and is null when none are rated. No React Native imports, so
// it runs under `npm test`.

import type { PlayerRow } from "./api/types.ts";

export const NOT_RATED = "Not Rated";

/** "3.45" or "Not Rated". */
export function formatScore(value: number | null | undefined): string {
  return value == null || !(value > 0) ? NOT_RATED : value.toFixed(2);
}

/** The number a Players-list row shows: that night's PPV when a night is
 *  picked, else the Global Score. null = Not Rated. */
export function listScore(row: PlayerRow, nightSelected: boolean): number | null {
  if (nightSelected) return row.ratings.rated ? row.ratings.ppv : null;
  return row.global_score ?? null;
}

/** Goalies and Goalie & Skaters — listed first, by goalie rating. */
export function inGoalieGroup(row: PlayerRow): boolean {
  return row.is_goalie || row.player_type === "goalie" || row.player_type === "goalie_skater";
}

/** A goalie's rating for the list: that night's when a night is picked,
 *  else the Global Goalie Score. null = Not Rated (or not a goalie). */
export function listGoalieScore(row: PlayerRow, nightSelected: boolean): number | null {
  if (!inGoalieGroup(row)) return null;
  const v = nightSelected ? row.ratings.goalie : row.global_goalie_score;
  return v != null && v > 0 ? v : null;
}

/** The list's number(s), as on the website: "3.10" for a skater, "G 2.40"
 *  for a goalie, "3.10 · G 2.40" for a Goalie & Skater, "Not Rated" when
 *  there's nothing to show. */
export function listText(row: PlayerRow, nightSelected: boolean): string {
  const parts: string[] = [];
  const skater = listScore(row, nightSelected);
  const pureGoalie = row.player_type === "goalie";
  if (skater != null && skater > 0 && !pureGoalie) parts.push(skater.toFixed(2));
  const goalie = listGoalieScore(row, nightSelected);
  if (goalie != null) parts.push(`G ${goalie.toFixed(2)}`);
  return parts.length ? parts.join(" · ") : NOT_RATED;
}

/** Goalies (and G/S) first by goalie rating, then skaters by PPV; Not Rated
 *  last in each group, by name. Same order as the website. */
export function sortByScore(rows: PlayerRow[], nightSelected: boolean): PlayerRow[] {
  const score = (r: PlayerRow) =>
    inGoalieGroup(r) ? listGoalieScore(r, nightSelected) : listScore(r, nightSelected);
  return [...rows].sort((a, b) => {
    const ga = inGoalieGroup(a) ? 0 : 1;
    const gb = inGoalieGroup(b) ? 0 : 1;
    if (ga !== gb) return ga - gb;
    const sa = score(a);
    const sb = score(b);
    if (sa == null && sb == null) return a.name.localeCompare(b.name);
    if (sa == null) return 1;
    if (sb == null) return -1;
    return sb - sa || a.name.localeCompare(b.name);
  });
}

/** "OBH A".."OBH D" for a rated PPV (the website's director_player_profile). */
export function obhGrade(ppv: number | null | undefined): string {
  if (ppv == null || !(ppv > 0)) return "";
  if (ppv >= 4.5) return "OBH A";
  if (ppv >= 3.5) return "OBH B";
  if (ppv >= 2.5) return "OBH C";
  return "OBH D";
}

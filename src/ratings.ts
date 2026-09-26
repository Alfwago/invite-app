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

/** Highest first; Not Rated players at the bottom, by name. */
export function sortByScore(rows: PlayerRow[], nightSelected: boolean): PlayerRow[] {
  return [...rows].sort((a, b) => {
    const sa = listScore(a, nightSelected);
    const sb = listScore(b, nightSelected);
    if (sa == null && sb == null) return a.name.localeCompare(b.name);
    if (sa == null) return 1;
    if (sb == null) return -1;
    return sb - sa;
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

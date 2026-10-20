import type { PlayerRow } from "./api/types.ts";
import { sortByScore } from "./ratings.ts";

/** Player Profiles sort options (server 0.38.0 #6/#7; the server sends the
 *  same list as `sorts`). Default is by name, "Lastname, Firstname". */
export type PlayerSortKey = "name" | "name_desc" | "rating" | "group" | "joined" | "last_skated";

export const PLAYER_SORTS: { key: PlayerSortKey; label: string }[] = [
  { key: "name", label: "Name A–Z" },
  { key: "name_desc", label: "Name Z–A" },
  { key: "rating", label: "Rating" },
  { key: "group", label: "Skate group" },
  { key: "joined", label: "Join date (newest)" },
  { key: "last_skated", label: "Last skated (recent)" },
];

const byName = (a: PlayerRow, b: PlayerRow) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

/** Newest first; rows without a date last; ties by name. */
const byDateDesc = (get: (r: PlayerRow) => string | null | undefined) => (a: PlayerRow, b: PlayerRow) => {
  const da = get(a);
  const db = get(b);
  if (!da && !db) return byName(a, b);
  if (!da) return 1;
  if (!db) return -1;
  return db.localeCompare(da) || byName(a, b);
};

export function sortPlayers(rows: PlayerRow[], key: PlayerSortKey, nightSelected: boolean): PlayerRow[] {
  const list = [...rows];
  switch (key) {
    case "name_desc":
      return list.sort((a, b) => byName(b, a));
    case "rating":
      return sortByScore(list.sort(byName), nightSelected);
    case "group":
      return list.sort((a, b) => (a.group_rank ?? 999) - (b.group_rank ?? 999) || byName(a, b));
    case "joined":
      return list.sort(byDateDesc((r) => r.join_date));
    case "last_skated":
      return list.sort(byDateDesc((r) => r.last_skated));
    case "name":
    default:
      return list.sort(byName);
  }
}

/** The line under a name when the sort is by a date. */
export function sortDetail(row: PlayerRow, key: PlayerSortKey): string | null {
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (key === "joined") return row.join_date ? `Joined ${fmt(row.join_date)}` : "No join date";
  if (key === "last_skated") return row.last_skated ? `Last skated ${fmt(row.last_skated)}` : "No skates yet";
  return null;
}

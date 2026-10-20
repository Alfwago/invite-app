import type { DayPlayer, RosterEntry } from "./api/types.ts";

/** The Going tab once teams are published (server 0.38.0 #4, owner 4a A /
 *  4b A): Gold Team, Black Team, Not on a team (walk-ons too), then the
 *  director's reserved spots. The server already sends rows in team order
 *  (goalies first, then A-Z); this only splits them into sections. Before
 *  teams are published: one untitled section, then reserved spots. */
export interface RosterSection {
  title: string | null;
  players: RosterEntry[];
  dayPlayers: DayPlayer[];
}

export function goingSections(players: RosterEntry[], dayPlayers: DayPlayer[]): RosterSection[] {
  const walkOns = dayPlayers.filter((d) => !d.is_reservation);
  const held = dayPlayers.filter((d) => d.is_reservation);
  const teams = players.some((p) => p.team === "Gold" || p.team === "Black");
  const out: RosterSection[] = [];
  if (teams) {
    const gold = players.filter((p) => p.team === "Gold");
    const black = players.filter((p) => p.team === "Black");
    const none = players.filter((p) => p.team !== "Gold" && p.team !== "Black");
    if (gold.length) out.push({ title: `Gold Team (${gold.length})`, players: gold, dayPlayers: [] });
    if (black.length) out.push({ title: `Black Team (${black.length})`, players: black, dayPlayers: [] });
    if (none.length || walkOns.length) {
      out.push({ title: `Not on a team (${none.length + walkOns.length})`, players: none, dayPlayers: walkOns });
    }
  } else if (players.length || walkOns.length) {
    out.push({ title: null, players, dayPlayers: walkOns });
  }
  if (held.length) out.push({ title: `Reserved by Director (${held.length})`, players: [], dayPlayers: held });
  return out;
}

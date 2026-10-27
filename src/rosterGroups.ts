import type { DayPlayer, RosterEntry } from "./api/types.ts";

/** The Going tab once teams are published (server 0.38.0 #4, owner 4a A /
 *  4b A): Gold Team, Black Team, Not on a team, then the
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
    // Walk-ons carry their pushed team too (server 0.40.0+; null before) —
    // a walk-on goalie in Gold's net is on Gold (owner 2026-10-27).
    const side = (team: string) => ({
      players: players.filter((p) => p.team === team),
      dayPlayers: walkOns.filter((d) => d.team === team),
    });
    const gold = side("Gold");
    const black = side("Black");
    const none = players.filter((p) => p.team !== "Gold" && p.team !== "Black");
    const noneWalkOns = walkOns.filter((d) => d.team !== "Gold" && d.team !== "Black");
    const n = (s: { players: unknown[]; dayPlayers: unknown[] }) => s.players.length + s.dayPlayers.length;
    if (n(gold)) out.push({ title: `Gold Team (${n(gold)})`, ...gold });
    if (n(black)) out.push({ title: `Black Team (${n(black)})`, ...black });
    if (none.length || noneWalkOns.length) {
      out.push({
        title: `Not on a team (${none.length + noneWalkOns.length})`,
        players: none,
        dayPlayers: noneWalkOns,
      });
    }
  } else if (players.length || walkOns.length) {
    out.push({ title: null, players, dayPlayers: walkOns });
  }
  if (held.length) out.push({ title: `Reserved by Director (${held.length})`, players: [], dayPlayers: held });
  return out;
}

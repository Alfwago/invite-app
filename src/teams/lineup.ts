// The Team Generator's shared lineup (server 0.34+): the server owns the
// teams for each event and the website shows the same ones. These helpers
// turn server responses into what the screen needs. No React Native
// imports, so they run under `npm test`.

import type { TeamLineup, TeamLineupPlayer } from "../api/types.ts";
import { movedIds } from "./moves.ts";

export type Team = "Gold" | "Black";

export const CONFLICT_TEXT = "Teams changed on another device — reloaded.";
export const OFFLINE_TEXT = "Couldn't reach the server — nothing was changed.";

/** {playerId: team} for everyone on a team (goalie slots aren't "on" one). */
export function assignmentOf(lineup: TeamLineup | null | undefined): Record<string, Team> {
  const out: Record<string, Team> = {};
  for (const p of lineup?.players ?? []) if (p.team) out[p.id] = p.team;
  return out;
}

/** Who changed team between two lineups — for the toast and the gold flash. */
export function lineupMoves(before: TeamLineup | null | undefined, after: TeamLineup): string[] {
  return movedIds(assignmentOf(before), assignmentOf(after));
}

/** A team's rows: roster order, goalies who skate first (as on the website). */
export function teamRows(lineup: TeamLineup, team: Team): TeamLineupPlayer[] {
  const mine = lineup.players.filter((p) => p.team === team);
  return [...mine.filter((p) => p.is_goalie), ...mine.filter((p) => !p.is_goalie)];
}

/** The lineup a 409 carries (the teams as they are now), else null. */
export function conflictLineup(err: unknown): TeamLineup | null {
  const e = err as { status?: number; payload?: { lineup?: TeamLineup } } | null;
  return e && e.status === 409 && e.payload?.lineup ? e.payload.lineup : null;
}

/** A hand move shown before the server answers. */
export function optimisticMove(lineup: TeamLineup, id: string): TeamLineup {
  const p = lineup.players.find((x) => x.id === id);
  if (!p?.team) return lineup;
  const to: Team = p.team === "Gold" ? "Black" : "Gold";
  return {
    ...lineup,
    gold: to === "Gold" ? [...lineup.gold, id] : lineup.gold.filter((k) => k !== id),
    black: to === "Black" ? [...lineup.black, id] : lineup.black.filter((k) => k !== id),
    players: lineup.players.map((x) => (x.id === id ? { ...x, team: to } : x)),
  };
}

/** The note when someone else's change arrives. */
export function syncNote(lineup: TeamLineup): string {
  return lineup.updated_by ? `Updated by ${lineup.updated_by}` : "Roster changed — teams updated";
}

/** Name for a pair/split chip, falling back to the last name the server knew. */
export function nameOf(lineup: TeamLineup, id: string): string {
  return lineup.players.find((p) => p.id === id)?.name ?? lineup.pair_names[id] ?? "(removed)";
}

export function partnersOf(edges: [string, string][], id: string): string[] {
  return edges.filter(([a, b]) => a === id || b === id).map(([a, b]) => (a === id ? b : a));
}

export function hasEdge(edges: [string, string][], a: string, b: string): boolean {
  return edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

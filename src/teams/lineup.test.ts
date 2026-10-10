import assert from "node:assert/strict";
import { test } from "node:test";

import type { TeamLineup, TeamLineupPlayer } from "../api/types.ts";
import {
  assignmentOf,
  conflictLineup,
  hasEdge,
  lineupMoves,
  nameOf,
  optimisticMove,
  partnersOf,
  syncNote,
  teamRows,
} from "./lineup.ts";

function player(id: string, team: "Gold" | "Black" | null, extra: Partial<TeamLineupPlayer> = {}): TeamLineupPlayer {
  return {
    id, name: `P${id}`, is_goalie: false, present: true, ppv: 3, goalie_rating: 2, rating: 3,
    team, slot: null, locked: false, is_new: false, ...extra,
  };
}

function lineup(players: TeamLineupPlayer[], extra: Partial<TeamLineup> = {}): TeamLineup {
  return {
    event_id: 1, version: 3, updated_by: "", updated_at: null, balanced: true, locked: false,
    locked_by: "", locked_at: null, published_at: null, present_only: false,
    roster_count: players.length, present_count: players.length, players,
    gold: players.filter((p) => p.team === "Gold").map((p) => p.id),
    black: players.filter((p) => p.team === "Black").map((p) => p.id),
    gold_goalie: null, black_goalie: null, gold_total: 0, black_total: 0,
    pairs: [], splits: [], pair_names: {}, ...extra,
  };
}

test("assignment skips goalie slots", () => {
  const l = lineup([player("1", "Gold"), player("2", null, { slot: "Gold", is_goalie: true })]);
  assert.deepEqual(assignmentOf(l), { "1": "Gold" });
});

test("moves are computed from before/after (new players don't count)", () => {
  const before = lineup([player("1", "Gold"), player("2", "Black")]);
  const after = lineup([player("1", "Black"), player("2", "Black"), player("3", "Gold")]);
  assert.deepEqual(lineupMoves(before, after), ["1"]);
  assert.deepEqual(lineupMoves(null, after), []);
});

test("team rows keep roster order with skating goalies first", () => {
  const l = lineup([player("1", "Gold"), player("2", "Gold", { is_goalie: true }), player("3", "Gold")]);
  assert.deepEqual(teamRows(l, "Gold").map((p) => p.id), ["2", "1", "3"]);
});

test("a 409 hands back the current lineup; other errors don't", () => {
  const current = lineup([player("1", "Gold")]);
  assert.equal(conflictLineup({ status: 409, payload: { lineup: current } }), current);
  assert.equal(conflictLineup({ status: 400, payload: { detail: "no" } }), null);
  assert.equal(conflictLineup(new TypeError("Network request failed")), null);
});

test("optimistic move flips one player only", () => {
  const l = lineup([player("1", "Gold"), player("2", "Black")]);
  const m = optimisticMove(l, "1");
  assert.deepEqual(m.gold, []);
  assert.deepEqual(m.black, ["2", "1"]);
  assert.equal(m.players[0].team, "Black");
  assert.equal(l.players[0].team, "Gold"); // input untouched
  assert.equal(optimisticMove(l, "nobody"), l);
});

test("sync note names who changed it, or the roster", () => {
  assert.equal(syncNote(lineup([], { updated_by: "Joe M" })), "Updated by Joe M");
  assert.equal(syncNote(lineup([])), "Roster changed — teams updated");
});

test("chip names fall back to the server's last-known name", () => {
  const l = lineup([player("1", "Gold")], { pair_names: { day_9: "Walk On" } });
  assert.equal(nameOf(l, "1"), "P1");
  assert.equal(nameOf(l, "day_9"), "Walk On");
  assert.equal(nameOf(l, "x"), "(removed)");
});

test("edge helpers ignore direction", () => {
  const edges: [string, string][] = [["1", "2"], ["3", "1"]];
  assert.deepEqual(partnersOf(edges, "1"), ["2", "3"]);
  assert.ok(hasEdge(edges, "2", "1"));
  assert.ok(!hasEdge(edges, "2", "3"));
});

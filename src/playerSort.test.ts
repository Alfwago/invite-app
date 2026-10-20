import { test } from "node:test";
import assert from "node:assert/strict";

import type { PlayerRow } from "./api/types.ts";
import { sortPlayers } from "./playerSort.ts";

function row(id: number, name: string, extra: Partial<PlayerRow> = {}): PlayerRow {
  return {
    id,
    name,
    profile_id: "",
    is_goalie: false,
    player_type: "skater",
    ratings: { skating: 0, defense: 0, offense: 0, ppv: 0, rated: false } as never,
    rating_source: "none",
    global_score: null,
    global_goalie_score: null,
    ...extra,
  };
}

const rows = [
  row(1, "Zane, Amy", { join_date: "2020-01-01", last_skated: "2026-09-20", group_rank: 2 }),
  row(2, "Adams, Bob", { join_date: "2024-06-01", last_skated: null, group_rank: 0 }),
  row(3, "Moss, Cal", { join_date: null, last_skated: "2026-10-16", group_rank: 0 }),
];
const names = (r: PlayerRow[]) => r.map((x) => x.name);

test("name A-Z and Z-A", () => {
  assert.deepEqual(names(sortPlayers(rows, "name", false)), ["Adams, Bob", "Moss, Cal", "Zane, Amy"]);
  assert.deepEqual(names(sortPlayers(rows, "name_desc", false)), ["Zane, Amy", "Moss, Cal", "Adams, Bob"]);
});

test("joined and last skated: newest first, missing last", () => {
  assert.deepEqual(names(sortPlayers(rows, "joined", false)), ["Adams, Bob", "Zane, Amy", "Moss, Cal"]);
  assert.deepEqual(names(sortPlayers(rows, "last_skated", false)), ["Moss, Cal", "Zane, Amy", "Adams, Bob"]);
});

test("skate group, then name", () => {
  assert.deepEqual(names(sortPlayers(rows, "group", false)), ["Adams, Bob", "Moss, Cal", "Zane, Amy"]);
});

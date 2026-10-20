import { test } from "node:test";
import assert from "node:assert/strict";

import type { DayPlayer, RosterEntry } from "./api/types.ts";
import { goingSections } from "./rosterGroups.ts";

const p = (id: number, team: "Gold" | "Black" | null) => ({ player_id: id, name: `P${id}`, team }) as unknown as RosterEntry;
const dp = (id: number, res = false) => ({ id, name: res ? "Reserved by Director" : `W${id}`, is_reservation: res }) as unknown as DayPlayer;

test("no teams: one section, reserved spots last", () => {
  const s = goingSections([p(1, null), p(2, null)], [dp(9), dp(8, true)]);
  assert.deepEqual(s.map((x) => x.title), [null, "Reserved by Director (1)"]);
  assert.equal(s[0].dayPlayers.length, 1);
});

test("teams: Gold, Black, Not on a team (with walk-ons), Reserved", () => {
  const s = goingSections([p(1, "Gold"), p(2, "Black"), p(3, null)], [dp(9), dp(8, true)]);
  assert.deepEqual(s.map((x) => x.title), ["Gold Team (1)", "Black Team (1)", "Not on a team (2)", "Reserved by Director (1)"]);
});

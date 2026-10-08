import assert from "node:assert/strict";
import { test } from "node:test";

import { balanceMessage, movedIds } from "./moves.ts";

test("movedIds lists only players whose team changed", () => {
  const prev = { "1": "Gold", "2": "Black", "3": "Gold", w4: "Black" };
  const next = { "1": "Black", "2": "Black", "3": "Gold", w4: "Gold" };
  assert.deepEqual(movedIds(prev, next).sort(), ["1", "w4"]);
});

test("movedIds ignores players new to, or missing from, either side", () => {
  // 5 is new (e.g. Present only switched off), 2 dropped out (now a goalie slot).
  const prev = { "1": "Gold", "2": "Black" };
  const next = { "1": "Gold", "5": "Black" };
  assert.deepEqual(movedIds(prev, next), []);
});

test("movedIds on a first balance is empty", () => {
  assert.deepEqual(movedIds({}, { "1": "Gold", "2": "Black" }), []);
});

test("balanceMessage wording", () => {
  assert.equal(balanceMessage(false, 0), "Teams balanced");
  assert.equal(balanceMessage(true, 0), "Teams balanced: no one moved");
  assert.equal(balanceMessage(true, 1), "Teams balanced: 1 player moved");
  assert.equal(balanceMessage(true, 4), "Teams balanced: 4 players moved");
});

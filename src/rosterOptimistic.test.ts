import assert from "node:assert/strict";
import { test } from "node:test";

import type { EventDetail } from "./api/types.ts";
import { applyOptimisticRosterAction } from "./rosterOptimistic.ts";

function event(): EventDetail {
  return {
    players: [
      { player_id: 1, present: false, paid: false, guests: [{ name: "G", present: false, paid: false }] },
      { player_id: 2, present: false, paid: false, guests: [] },
    ],
    day_players: [{ id: 9, present: false, paid: false }],
  } as unknown as EventDetail;
}

test("set_present / set_paid flip only the targeted player", () => {
  const next = applyOptimisticRosterAction(event(), { action: "set_present", player_id: 2, present: true })!;
  assert.equal(next.players[1].present, true);
  assert.equal(next.players[0].present, false);
  const paid = applyOptimisticRosterAction(event(), { action: "set_paid", player_id: 1, paid: true })!;
  assert.equal(paid.players[0].paid, true);
});

test("walk-ons and guests", () => {
  const dp = applyOptimisticRosterAction(event(), { action: "set_paid", day_player_id: 9, paid: true })!;
  assert.equal(dp.day_players[0].paid, true);
  const g = applyOptimisticRosterAction(event(), {
    action: "guest_present", player_id: 1, guest_index: 0, present: true,
  })!;
  assert.equal(g.players[0].guests[0].present, true);
});

test("doesn't mutate the cached event", () => {
  const before = event();
  applyOptimisticRosterAction(before, { action: "set_present", player_id: 1, present: true });
  assert.equal(before.players[0].present, false);
});

test("other roster actions wait for the server", () => {
  assert.equal(applyOptimisticRosterAction(event(), { action: "remove", player_id: 1 }), null);
});

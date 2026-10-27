import { test } from "node:test";
import assert from "node:assert/strict";

import type { RosterStats } from "./api/types.ts";
import { isSkating, rosterBadges, rosterHealth, spotsOpen } from "./roster.ts";

function stats(patch: Partial<RosterStats>): RosterStats {
  return {
    yes: 0, no: 0, maybe: 0, waitlist: 0, no_response: 0, guest_yes: 0, day_players: 0,
    skaters: 10, goalies: 1, capacity: 20, goalies_needed: 2,
    skater_spots_open: 10, goalie_spots_open: 1, is_full: false,
    rsvp_locked: false, goalie_rsvp_locked: false,
    ...patch,
  };
}

test("a skate still needs skaters and goalies", () => {
  const r = stats({});
  assert.equal(isSkating(r), true);
  assert.deepEqual(rosterBadges(r).map((b) => b.label), ["NEED SKATERS", "NEED GOALIES"]);
  assert.equal(rosterHealth(r), "bad");
  assert.equal(spotsOpen(r), 10);
});

test("a party never needs skaters or goalies (owner 2026-10-27)", () => {
  const party = stats({
    is_skating: false, goalies: 0, goalies_needed: null, goalie_spots_open: null,
    skater_spots_open: null, spots_open: 17, skaters: 3,
  });
  assert.equal(isSkating(party), false);
  assert.deepEqual(rosterBadges(party), []);
  assert.equal(rosterHealth(party), "good");
  assert.equal(spotsOpen(party), 17);
  assert.deepEqual(rosterBadges({ ...party, is_full: true }).map((b) => b.label), ["FULL"]);
});

test("an older server (no is_skating) is a skate", () => {
  assert.equal(isSkating(stats({ is_skating: undefined })), true);
});

import { test } from "node:test";
import assert from "node:assert/strict";

import type { RosterEntry } from "./api/types.ts";
import {
  lateScratchControl,
  lateScratchRows,
  lateScratchStatus,
  postConfirmCopy,
} from "./lateScratch.ts";

function row(over: Partial<RosterEntry>): RosterEntry {
  return {
    player_id: 1,
    name: "Sam Smith",
    status: "NO",
    is_goalie: false,
    is_director: false,
    pays: true,
    guest_count: 0,
    guest_names: [],
    guests: [],
    is_beer_guy: false,
    is_whiskey_guy: false,
    present: false,
    paid: false,
    added_by_director: false,
    team: null,
    late_drop_at: "2026-10-16T18:15:00-04:00",
    ...over,
  };
}

test("lateScratchRows: older server (no key) shows no card", () => {
  assert.deepEqual(lateScratchRows({}), []);
  assert.equal(lateScratchRows({ late_scratches: [] }).length, 0);
});

test("lateScratchStatus labels", () => {
  assert.equal(lateScratchStatus("NO"), "No");
  assert.equal(lateScratchStatus("MAYBE"), "Maybe");
  assert.equal(lateScratchStatus("WAITLIST"), "Waitlisted");
});

test("lateScratchControl: Not posted → Post to board; posted → Un-post", () => {
  assert.deepEqual(lateScratchControl(row({ late_drop_posted: false }), false), {
    posted: false,
    tag: "Not posted",
    button: "Post to board",
  });
  assert.deepEqual(lateScratchControl(row({ late_drop_posted: true }), false), {
    posted: true,
    tag: "On Late Scratches",
    button: "Un-post",
  });
});

test("lateScratchControl: hidden on an older server and on a past skate", () => {
  assert.equal(lateScratchControl(row({}), false), null);
  assert.equal(lateScratchControl(row({ late_drop_posted: false }), true), null);
});

test("postConfirmCopy never mentions money amounts", () => {
  const copy = postConfirmCopy("Sam Smith");
  assert.equal(copy.title, "Post Sam Smith to Late Scratches?");
  assert.doesNotMatch(copy.body, /\$/);
});

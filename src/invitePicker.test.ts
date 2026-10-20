import { test } from "node:test";
import assert from "node:assert/strict";

import type { Candidate } from "./api/types.ts";
import { buildInviteGroups, groupState, matches, toggleGroup } from "./invitePicker.ts";

const c = (id: number, name: string) => ({ id, name, is_goalie: false, is_goalie_skater: false }) as Candidate;
const inv = [c(1, "Adams, Bob"), c(2, "Moss, Cal"), c(3, "Zane, Amy")];

test("groups keep only invitable people; empty groups dropped", () => {
  const g = buildInviteGroups(inv, [
    { id: 5, name: "Monday Mules", member_ids: [1, 2, 99] },
    { id: 6, name: "Thursday", member_ids: [98] },
    { id: null, name: "Everyone else", member_ids: [3] },
  ]);
  assert.deepEqual(g.map((x) => [x.name, x.members.map((m) => m.id)]), [
    ["Monday Mules", [1, 2]],
    ["Everyone else", [3]],
  ]);
});

test("older server: one flat list", () => {
  assert.deepEqual(buildInviteGroups(inv, undefined).map((g) => g.name), ["Players"]);
});

test("All of a group toggles, and partial state shows", () => {
  const members = [inv[0], inv[1]];
  assert.equal(groupState(members, new Set()), "none");
  const picked = toggleGroup([3], members);
  assert.deepEqual(picked.sort(), [1, 2, 3]);
  assert.equal(groupState(members, new Set([1])), "some");
  assert.deepEqual(toggleGroup(picked, members), [3]);
});

test("search", () => {
  assert.equal(matches(inv[0], "adam"), true);
  assert.equal(matches(inv[0], "zane"), false);
  assert.equal(matches(inv[0], " "), true);
});

test("groups where everyone is invited still show, greyed", () => {
  const g = buildInviteGroups(
    [c(1, "Adams, Bob")],
    [
      { id: 5, name: "Monday", member_ids: [1, 2], members: [{ id: 1, name: "Adams, Bob" }, { id: 2, name: "Moss, Cal" }] },
      { id: 6, name: "Thursday", member_ids: [2], members: [{ id: 2, name: "Moss, Cal" }] },
    ],
    [2],
  );
  assert.deepEqual(g.map((x) => [x.name, x.members.length, x.invited.map((i) => i.name)]), [
    ["Monday", 1, ["Moss, Cal"]],
    ["Thursday", 0, ["Moss, Cal"]],
  ]);
  assert.equal(groupState(g[1].members, new Set()), "all");
});

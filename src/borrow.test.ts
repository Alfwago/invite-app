import assert from "node:assert/strict";
import { test } from "node:test";

import {
  candidateA11yLabel,
  confirmCopy,
  emptyText,
  filterCandidates,
  groupCandidates,
  makePermanentCopy,
  roleMark,
  successText,
  weekdayOf,
  type BorrowCandidate,
  type BorrowPanel,
} from "./borrow.ts";

function cand(over: Partial<BorrowCandidate>): BorrowCandidate {
  return {
    id: 1,
    name: "Sam Lee",
    first_name: "Sam",
    is_goalie: false,
    is_goalie_skater: false,
    can_goalie: false,
    can_skate: true,
    home_nights: [{ id: 5, name: "Thursday Night" }],
    home_label: "Thu",
    group: "Thursday Night",
    ...over,
  };
}

const goalie = cand({ id: 1, is_goalie: true, can_goalie: true, can_skate: false });
const both = cand({
  id: 2,
  name: "Pat Both",
  first_name: "Pat",
  is_goalie_skater: true,
  can_goalie: true,
  can_skate: true,
  home_nights: [
    { id: 1, name: "Sunday Morning" },
    { id: 5, name: "Thursday Night" },
  ],
  home_label: "Sun · Thu",
  group: "Sunday Morning",
});
const skater = cand({ id: 3, name: "Kim Ray", first_name: "Kim" });

const panel: BorrowPanel = {
  available: true,
  reason: "",
  night_name: "Tuesday Night",
  event_day: "Oct 7",
  default_role: "goalie",
  warnings: { goalie: "", skater: "" },
  players: [both, goalie, skater],
};

test("filterCandidates: Goalie shows goalies + G/S, Skater shows skaters + G/S", () => {
  assert.deepEqual(filterCandidates(panel.players, "goalie", "").map((p) => p.id), [2, 1]);
  assert.deepEqual(filterCandidates(panel.players, "skater", "").map((p) => p.id), [2, 3]);
  assert.deepEqual(filterCandidates(panel.players, "skater", " kim ").map((p) => p.id), [3]);
});

test("groupCandidates keeps server order, one group per home night", () => {
  const g = groupCandidates([both, goalie, skater]);
  assert.deepEqual(
    g.map((x) => [x.night, x.players.map((p) => p.id)]),
    [
      ["Sunday Morning", [2]],
      ["Thursday Night", [1, 3]],
    ],
  );
});

test("roleMark and a11y label", () => {
  assert.equal(roleMark(goalie), "G");
  assert.equal(roleMark(both), "G/S");
  assert.equal(roleMark(skater), "");
  assert.equal(candidateA11yLabel(goalie), "Sam Lee, goalie, Thursday Night");
  assert.equal(candidateA11yLabel(both), "Pat Both, goalie or skater, Sunday Morning, Thursday Night");
});

test("emptyText: nobody, no goalies, search miss, or nothing to say", () => {
  assert.equal(emptyText([], "skater", ""), "No players from other skate groups are free for this skate.");
  assert.equal(
    emptyText([skater], "goalie", ""),
    "No goalies from other skate groups are free. Try Skater, or add a walk-on goalie below.",
  );
  assert.equal(
    emptyText([skater], "skater", "zed"),
    "No one named 'zed' in other skate groups. Not in the app? Add them as a walk-on below.",
  );
  assert.equal(emptyText([skater], "skater", "ki"), "");
});

test("confirmCopy matches the owner's wording, plus the server's warning", () => {
  assert.deepEqual(confirmCopy(goalie, "goalie", panel), {
    title: "Add Sam Lee as goalie?",
    body:
      "Sam (Thursday Night) goes straight onto Tuesday Night's Oct 7 roster as Yes, for this skate only. " +
      "They'll get a push and email now.",
    button: "Add & notify Sam",
  });
  const full = {
    ...panel,
    warnings: {
      goalie: "Goalies are already full (2 of 2); the waitlisted goalie will stay waitlisted.",
      skater: "",
    },
  };
  assert.match(confirmCopy(goalie, "goalie", full).body, /\n\nGoalies are already full \(2 of 2\)/);
});

test("successText notes email-only when no push reached them", () => {
  assert.equal(successText({ name: "Sam Lee", role: "goalie", pushed: true }), "Sam Lee added as goalie, notified.");
  assert.equal(
    successText({ name: "Sam Lee", role: "skater", pushed: false }),
    "Sam Lee added as skater, notified by email only.",
  );
});

test("makePermanentCopy + weekdayOf", () => {
  assert.equal(weekdayOf("2026-10-06"), "Tuesday");
  assert.deepEqual(makePermanentCopy("Sam Lee", "Tuesday Night", "Tuesday", "Thursday Night"), {
    title: "Add Sam Lee to Tuesday Night?",
    body: "They'll be invited to every Tuesday skate from now on. They stay in Thursday Night.",
    button: "Add to Tuesday Night",
  });
});

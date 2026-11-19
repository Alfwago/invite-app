import { test } from "node:test";
import assert from "node:assert/strict";

import { goalieBarPct, ratingBarParts, skillsLabel } from "./ratingBar.ts";

test("the slices add up to the rating out of 5", () => {
  const skills = { hockey_sense: 4, skating: 3, defense: 5, offense: 2 };
  const ppv = 4 * 0.4 + 3 * 0.25 + 5 * 0.2 + 2 * 0.15; // 3.65
  const total = ratingBarParts(skills).reduce((s, p) => s + p.pct, 0);
  assert.ok(Math.abs(total - (ppv / 5) * 100) < 1e-9);
});

test("all fives fill the row; weights set each slice", () => {
  const parts = ratingBarParts({ hockey_sense: 5, skating: 5, defense: 5, offense: 5 });
  assert.deepEqual(parts.map((p) => Math.round(p.pct)), [40, 25, 20, 15]);
});

test("bad or out-of-range scores are clamped", () => {
  const parts = ratingBarParts({ hockey_sense: 9, skating: -1, defense: NaN, offense: 5 });
  assert.deepEqual(parts.map((p) => Math.round(p.pct)), [40, 0, 0, 15]);
});

test("goalie bar is out of 3, and the label reads each skill", () => {
  assert.equal(goalieBarPct(1.5), 50);
  assert.equal(goalieBarPct(4), 100);
  assert.equal(skillsLabel({ hockey_sense: 4, skating: 3.5, defense: 3, offense: 2 }),
    "Hockey Sense 4.0, Skating 3.5, Defense 3.0, Offense 2.0");
});

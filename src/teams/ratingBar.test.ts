import { test } from "node:test";
import assert from "node:assert/strict";

import { goalieBarPct, healthBarParts, ratingBarParts, skillShares, skillsLabel, matchup, skillEdges, teamHealth, teamSkillAverages, teamSkillPoints } from "./ratingBar.ts";

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

test("team averages, average rating and its percentage", () => {
  const team = teamSkillAverages([
    { skills: { hockey_sense: 4, skating: 4, defense: 4, offense: 4 } },
    { skills: { hockey_sense: 2, skating: 3, defense: 5, offense: 1 } },
    { skills: undefined }, // no scores (older server) — left out
  ]);
  assert.ok(team);
  assert.equal(team.count, 2);
  assert.deepEqual(team.skills, { hockey_sense: 3, skating: 3.5, defense: 4.5, offense: 2.5 });
  // 3*.4 + 3.5*.25 + 4.5*.2 + 2.5*.15 = 3.35
  assert.ok(Math.abs(team.ppv - 3.35) < 1e-9);
  assert.ok(Math.abs(team.pct - 67) < 1e-9);
  assert.equal(teamSkillAverages([{ skills: undefined }]), null);
});

test("skill shares are whole percents of the rating that add to 100", () => {
  // Black on TEST: HS 4.3, SK 3.2, D 3.9, O 3.6 → 1.72 / .8 / .78 / .54 of 3.84
  const s = skillShares({ hockey_sense: 4.3, skating: 3.2, defense: 3.9, offense: 3.6 });
  assert.deepEqual(s, { hockey_sense: 45, skating: 21, defense: 20, offense: 14 });
  const even = skillShares({ hockey_sense: 3, skating: 3, defense: 3, offense: 3 });
  assert.deepEqual(even, { hockey_sense: 40, skating: 25, defense: 20, offense: 15 });
  const odd = skillShares({ hockey_sense: 1, skating: 1, defense: 1, offense: 2 });
  assert.equal(Object.values(odd).reduce((a, b) => a + b, 0), 100);
  assert.deepEqual(skillShares({ hockey_sense: 0, skating: 0, defense: 0, offense: 0 }),
    { hockey_sense: 0, skating: 0, defense: 0, offense: 0 });
});

test("team health: balanced, heavy, light", () => {
  const even = teamHealth({ hockey_sense: 3, skating: 3.2, defense: 2.9, offense: 3.1 });
  assert.equal(even.label, "Balanced");
  assert.equal(Object.values(even.shares).reduce((a, b) => a + b, 0), 100);
  // Snipers: offense 4.5, defense 2 of 13.5 → 33% / 15%
  const snipers = teamHealth({ hockey_sense: 3.5, skating: 3.5, defense: 2, offense: 4.5 });
  assert.equal(snipers.heavy, "offense");
  assert.equal(snipers.light, "defense");
  assert.equal(snipers.label, "Heavy on Offense · Light on Defense");
  const slow = teamHealth({ hockey_sense: 3.5, skating: 2.3, defense: 3.4, offense: 3.4 }); // 18.5% skating
  assert.equal(slow.label, "Light on Skating");
  assert.equal(teamHealth({ hockey_sense: 0, skating: 0, defense: 0, offense: 0 }).label, "");
});

test("health bar slices are equal-weight shares", () => {
  const parts = healthBarParts({ hockey_sense: 2, skating: 2, defense: 2, offense: 2 });
  assert.deepEqual(parts.map((p) => p.pct), [25, 25, 25, 25]);
});

test("rating points per skill add up to the skaters' rating", () => {
  const players = [
    { skills: { hockey_sense: 4, skating: 3, defense: 5, offense: 2 } }, // 1.6 .75 1.0 .3 = 3.65
    { skills: { hockey_sense: 3, skating: 3, defense: 3, offense: 3 } }, // 1.2 .75 .6 .45 = 3.0
    { skills: undefined },
  ];
  const pts = teamSkillPoints(players);
  const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
  close(pts.hockey_sense, 2.8);
  close(pts.skating, 1.5);
  close(pts.defense, 1.6);
  close(pts.offense, 0.75);
  close(pts.total, 6.65);
});

test("matchup: even within 2 points, else stronger / weaker by the gap", () => {
  assert.deepEqual(matchup(34.76, 34.39).label, "Even");
  assert.equal(matchup(41.27, 27.88).label, "Stronger by 13.4");
  assert.equal(matchup(27.88, 41.27).label, "Weaker by 13.4");
  assert.equal(matchup(27.88, 41.27).tone, "weaker");
  assert.equal(matchup(30, 32).label, "Weaker by 2.0"); // 2 is not even
});

test("skill edges: arrows only past half a point", () => {
  const gold = { hockey_sense: 16.8, skating: 8.9, defense: 6.8, offense: 6.0 };
  const black = { hockey_sense: 9.6, skating: 7.2, defense: 6.6, offense: 3.5 };
  assert.deepEqual(skillEdges(gold, black), { hockey_sense: "up", skating: "up", defense: null, offense: "up" });
  assert.deepEqual(skillEdges(black, gold), { hockey_sense: "down", skating: "down", defense: null, offense: "down" });
});

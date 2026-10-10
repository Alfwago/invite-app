import assert from "node:assert/strict";
import { test } from "node:test";

import type { PlayerRow } from "./api/types.ts";
import { formatScore, listScore, listText, NOT_RATED, obhGrade, sortByScore } from "./ratings.ts";

function row(name: string, nightPpv: number, global: number | null): PlayerRow {
  return {
    id: name.length,
    name,
    profile_id: "",
    is_goalie: false,
    player_type: "skater",
    ratings: { hockey_sense: 0, skating: 0, defense: 0, offense: 0, goalie: 0, ppv: nightPpv, rated: nightPpv > 0 },
    rating_source: nightPpv > 0 ? "night" : "none",
    global_score: global,
    global_goalie_score: null,
  };
}

test("0.00 and missing scores read Not Rated", () => {
  assert.equal(formatScore(null), NOT_RATED);
  assert.equal(formatScore(0), NOT_RATED);
  assert.equal(formatScore(3.456), "3.46");
});

test("list shows the night PPV with a night picked, else the Global Score", () => {
  const r = row("Ann", 4.2, 3.9);
  assert.equal(listScore(r, true), 4.2);
  assert.equal(listScore(r, false), 3.9);
  assert.equal(listScore(row("Bo", 0, null), true), null);
});

test("sort: highest first, Not Rated last by name", () => {
  const rows = [row("Zed", 0, null), row("Amy", 0, null), row("Cal", 0, 3.1), row("Dee", 0, 4.4)];
  assert.deepEqual(sortByScore(rows, false).map((r) => r.name), ["Dee", "Cal", "Amy", "Zed"]);
});

test("OBH grades match the website", () => {
  assert.equal(obhGrade(4.5), "OBH A");
  assert.equal(obhGrade(3.5), "OBH B");
  assert.equal(obhGrade(2.5), "OBH C");
  assert.equal(obhGrade(1), "OBH D");
  assert.equal(obhGrade(0), "");
});

function goalieRow(
  name: string,
  type: "goalie" | "goalie_skater",
  nightPpv: number,
  nightGoalie: number,
  globalPpv: number | null,
  globalGoalie: number | null,
): PlayerRow {
  return {
    ...row(name, nightPpv, globalPpv),
    is_goalie: true,
    player_type: type,
    ratings: { hockey_sense: 0, skating: 0, defense: 0, offense: 0, goalie: nightGoalie, ppv: nightPpv, rated: nightPpv > 0 },
    global_goalie_score: globalGoalie,
  };
}

test("goalie ratings show on the list (website format)", () => {
  assert.equal(listText(goalieRow("Gus", "goalie_skater", 3.1, 2.4, 3.1, 2.4), true), "3.10 · G 2.40");
  assert.equal(listText(goalieRow("Gina", "goalie", 3.0, 2.4, null, 2.4), true), "G 2.40");
  assert.equal(listText(goalieRow("Gail", "goalie", 0, 0, null, null), false), NOT_RATED);
  assert.equal(listText(row("Sam", 4, 4), true), "4.00");
});

test("sort: goalies first by goalie rating, then skaters by PPV, Not Rated last in each", () => {
  const rows = [
    row("Sid", 0, null),
    row("Sam", 0, 4.0),
    goalieRow("Gail", "goalie", 0, 0, null, null),
    goalieRow("Gina", "goalie", 0, 0, null, 2.4),
    row("Stu", 0, 2.5),
    goalieRow("Gus", "goalie_skater", 0, 0, 3.1, 2.8),
  ];
  assert.deepEqual(
    sortByScore(rows, false).map((r) => r.name),
    ["Gus", "Gina", "Gail", "Sam", "Stu", "Sid"],
  );
});

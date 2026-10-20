import { test } from "node:test";
import assert from "node:assert/strict";

import { navTabs } from "./navTabs.ts";

const lit = (isDirector: boolean, path: string) =>
  navTabs(isDirector).filter((t) => t.active(path)).map((t) => t.key);

test("players get four tabs, directors five", () => {
  assert.deepEqual(navTabs(false).map((t) => t.label), ["Home", "Events", "Messages", "Profile"]);
  assert.deepEqual(navTabs(true).map((t) => t.label), ["Home", "Events", "Messages", "Directors", "Profile"]);
});

test("exactly one tab is lit", () => {
  assert.deepEqual(lit(true, "/director"), ["directors"]);
  assert.deepEqual(lit(true, "/players/12"), ["directors"]);
  assert.deepEqual(lit(true, "/polls/manage"), ["directors"]);
  assert.deepEqual(lit(true, "/polls/5"), ["home"]); // answering a poll is a player thing
  assert.deepEqual(lit(true, "/event/9/manage"), ["events"]);
  assert.deepEqual(lit(false, "/notices"), ["home"]);
  assert.deepEqual(lit(true, "/"), ["home"]);
});

import { test } from "node:test";
import assert from "node:assert/strict";

import { groupBySponsor } from "./approvalGroups.ts";

const row = (sponsor: string, sponsor_id?: number | null, account_ready = true, name = "") => ({
  sponsor,
  sponsor_id,
  account_ready,
  name,
});

test("your own group first, then the rest by director", () => {
  const groups = groupBySponsor(
    [row("Eli Carter", 3), row("Pat Admin", 1), row("Dana Brooks", 2), row("Eli Carter", 3)],
    1,
  );
  assert.deepEqual(
    groups.map((g) => [g.director, g.mine, g.items.length]),
    [["Pat Admin", true, 1], ["Dana Brooks", false, 1], ["Eli Carter", false, 2]],
  );
});

test("an older server without sponsor_id groups by name", () => {
  const groups = groupBySponsor([row("Dana Brooks"), row("Dana Brooks"), row("")], 1);
  assert.deepEqual(groups.map((g) => [g.director, g.items.length, g.mine]), [
    ["Dana Brooks", 2, false],
    ["No director", 1, false],
  ]);
});

test("ready to approve first in each group, with a ready count (1.8.2)", () => {
  const [group] = groupBySponsor(
    [row("Pat Admin", 1, false, "Able"), row("Pat Admin", 1, true, "Zed"), row("Pat Admin", 1, false, "Bale")],
    1,
  );
  assert.deepEqual(group.items.map((r) => r.name), ["Zed", "Able", "Bale"]);
  assert.equal(group.readyCount, 1);
});

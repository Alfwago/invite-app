import { test } from "node:test";
import assert from "node:assert/strict";

import type { RosterEntry } from "./api/types.ts";
import { fineControl, lateDropLine, lateDropRows, withLateFine } from "./lateDrop.ts";

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
    ...over,
  };
}

test("lateDropRows: only No/Maybe rows with late_drop_at", () => {
  const rows = [
    row({ player_id: 1, late_drop_at: "2026-10-13T18:15:00-04:00" }),
    row({ player_id: 2, status: "MAYBE", late_drop_at: "2026-10-13T18:20:00-04:00" }),
    row({ player_id: 3 }),
    row({ player_id: 4, status: "YES", late_drop_at: "2026-10-13T18:15:00-04:00" }),
    row({ player_id: 5, late_drop_at: null }),
  ];
  assert.deepEqual(lateDropRows(rows).map((r) => r.player_id), [1, 2]);
});

test("lateDropRows: older server (no late fields) shows nothing", () => {
  assert.deepEqual(lateDropRows([row({}), row({ status: "MAYBE" })]), []);
});

test("lateDropLine: time, how far before, status and fine", () => {
  const base = { late_drop_at: "x", late_drop_label: "6:15 PM (2h 24m before)" };
  assert.equal(lateDropLine(row({ ...base, late_fine: "owes" })), "Late drop · 6:15 PM (2h 24m before) · No");
  assert.equal(
    lateDropLine(row({ ...base, status: "MAYBE", late_fine: "waived" })),
    "Late drop · 6:15 PM (2h 24m before) · Maybe · fine waived",
  );
  assert.equal(lateDropLine(row({ ...base, late_fine: "none" })), "Late drop · 6:15 PM (2h 24m before) · No · no fee");
  // 0.34.3 server: label but no late_fine.
  assert.equal(lateDropLine(row({ ...base })), "Late drop · 6:15 PM (2h 24m before) · No");
  assert.equal(lateDropLine(row({ late_drop_at: "x" })), "Late drop · No");
});

test("fineControl: switch for owes/waived, exempt for none, hidden on older servers", () => {
  assert.equal(fineControl(row({ late_fine: "owes" })), "switch");
  assert.equal(fineControl(row({ late_fine: "waived" })), "switch");
  assert.equal(fineControl(row({ late_fine: "none" })), "exempt");
  assert.equal(fineControl(row({ late_fine: null })), "hidden");
  assert.equal(fineControl(row({})), "hidden");
});

test("withLateFine: flips owes <-> waived and pays; leaves exempt rows alone", () => {
  const owes = row({ late_fine: "owes", pays: true });
  const off = withLateFine(owes, false);
  assert.equal(off.late_fine, "waived");
  assert.equal(off.pays, false);
  const on = withLateFine(off, true);
  assert.equal(on.late_fine, "owes");
  assert.equal(on.pays, true);
  const exempt = row({ late_fine: "none", pays: false });
  assert.equal(withLateFine(exempt, true), exempt);
});

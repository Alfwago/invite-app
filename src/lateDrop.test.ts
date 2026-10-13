import { test } from "node:test";
import assert from "node:assert/strict";

import type { RosterEntry } from "./api/types.ts";
import { fineBadge, fineSettingsPatch, lateDropLine, lateDropRows } from "./lateDrop.ts";

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
    "Late drop · 6:15 PM (2h 24m before) · Maybe · no fine",
  );
  assert.equal(lateDropLine(row({ ...base, late_fine: "none" })), "Late drop · 6:15 PM (2h 24m before) · No · no fee");
  // 0.34.3 server: label but no late_fine.
  assert.equal(lateDropLine(row({ ...base })), "Late drop · 6:15 PM (2h 24m before) · No");
  assert.equal(lateDropLine(row({ late_drop_at: "x" })), "Late drop · No");
});

test("fineBadge: the skate's price on rows that owe, nothing otherwise", () => {
  assert.equal(fineBadge(row({ late_fine: "owes" }), 25), "Fine $25");
  assert.equal(fineBadge(row({ late_fine: "owes" }), 0), "Fine $0");
  assert.equal(fineBadge(row({ late_fine: "owes" }), undefined), "Fine");
  assert.equal(fineBadge(row({ late_fine: "waived" }), 20), null);
  assert.equal(fineBadge(row({ late_fine: "none" }), 20), null);
  assert.equal(fineBadge(row({}), 20), null);
});

test("fineSettingsPatch: sends only what the server knows", () => {
  assert.deepEqual(fineSettingsPatch({ fine_late_drops: true, skate_fee: 20 }, false, "25"), {
    fine_late_drops: false,
    skate_fee: 25,
  });
  // Older server: neither field in manage → nothing sent.
  assert.deepEqual(fineSettingsPatch({}, false, "25"), {});
  // A blank or odd fee isn't sent; the switch still is.
  assert.deepEqual(fineSettingsPatch({ fine_late_drops: true, skate_fee: 20 }, true, ""), { fine_late_drops: true });
});

import { test } from "node:test";
import assert from "node:assert/strict";

import { filterChips, inviteStatus, matchesFilter, removeConfirmText } from "./inviteList.ts";

const rows = [
  { status: "YES", sent_at: "2026-10-20T19:00:00Z" },
  { status: "YES", sent_at: null }, // added straight to the roster
  { status: "MAYBE", sent_at: "2026-10-20T19:00:00Z" },
  { status: "NO_RESPONSE", sent_at: "2026-10-20T19:00:00Z" },
  { status: "NO_RESPONSE", sent_at: null, from_group: "Thursday Night" },
];

test("status: RSVP first, then sent or not", () => {
  assert.equal(inviteStatus(rows[0]).label, "Going");
  assert.equal(inviteStatus(rows[1]).key, "going");
  assert.equal(inviteStatus(rows[2]).tone, "info");
  assert.deepEqual(inviteStatus(rows[3]), { key: "noreply", label: "No reply", tone: "neutral" });
  assert.deepEqual(inviteStatus(rows[4]), { key: "notsent", label: "Not sent", tone: "unsent" });
  assert.equal(inviteStatus({ status: "NO", sent_at: null }).label, "Can't make it");
});

test("filters", () => {
  assert.equal(rows.filter((r) => matchesFilter(r, "all")).length, 5);
  assert.equal(rows.filter((r) => matchesFilter(r, "other")).length, 1);
  assert.equal(rows.filter((r) => matchesFilter(r, "notsent")).length, 1);
});

test("chips: counts, empty ones dropped, All always there", () => {
  assert.deepEqual(
    filterChips(rows).map((c) => `${c.label} ${c.count}`),
    ["All 5", "Going 2", "Maybe 1", "No reply 1", "Not sent 1", "Other groups 1"],
  );
  assert.deepEqual(filterChips([]).map((c) => c.key), ["all"]);
});

test("remove confirm warns when Going", () => {
  assert.equal(removeConfirmText("Dunn, Pat", "NO_RESPONSE"), "Remove Dunn, Pat from the invite list?");
  assert.match(removeConfirmText("Abbott, Kyle", "YES"), /lose their spot/);
});

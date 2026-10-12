import assert from "node:assert/strict";
import { test } from "node:test";

import type { MyRsvp } from "./api/types.ts";
import { lateChangeMessage, lateChangeWarning, localStart } from "./lateChange.ts";

const now = new Date("2026-10-14T20:00:00Z");
const base: MyRsvp = {
  status: "YES",
  is_goalie: false,
  guest_count: 0,
  guests: [],
  is_beer_guy: false,
  is_whiskey_guy: false,
  responded_at: null,
};
const inWindow = {
  hours: 24,
  window_start: "2026-10-14T00:00:00Z",
  starts_at: "2026-10-14T23:00:00Z",
  fee: true,
  fee_amount: "$20",
};

test("message: the website's wording, fee line only when owed", () => {
  assert.equal(
    lateChangeMessage(24, true),
    "You're changing within 24 hours of the skate. You'll still owe the $20 late-change fee.",
  );
  assert.equal(lateChangeMessage(24, false), "You're changing within 24 hours of the skate.");
  assert.equal(lateChangeMessage(1, false), "You're changing within 1 hour of the skate.");
});

test("server window: Yes → No / Maybe inside it warns, with the server's fee", () => {
  const current = { ...base, late_change: inWindow };
  assert.match(lateChangeWarning({ current, choice: "NO", now })!, /owe the \$20/);
  assert.match(lateChangeWarning({ current, choice: "MAYBE", now })!, /within 24 hours/);
  const goalie = { ...base, is_goalie: true, late_change: { ...inWindow, fee: false } };
  assert.equal(lateChangeWarning({ current: goalie, choice: "NO", now }), "You're changing within 24 hours of the skate.");
});

test("no warning: staying Yes, not Yes, outside the window, or server says none", () => {
  const current = { ...base, late_change: inWindow };
  assert.equal(lateChangeWarning({ current, choice: "YES", now }), null);
  assert.equal(lateChangeWarning({ current: { ...current, status: "MAYBE" }, choice: "NO", now }), null);
  assert.equal(lateChangeWarning({ current, choice: "NO", now: new Date("2026-10-13T12:00:00Z") }), null);
  assert.equal(lateChangeWarning({ current, choice: "NO", now: new Date("2026-10-15T00:00:00Z") }), null);
  assert.equal(lateChangeWarning({ current: { ...base, late_change: null }, choice: "NO", now }), null);
  assert.equal(lateChangeWarning({ current: null, choice: "NO", now }), null);
});

test("older server: falls back to the director-only hours; goalies see no fee", () => {
  const start = localStart("2026-10-14", "19:30:00")!;
  const t = new Date(start.getTime() - 2 * 3600 * 1000);
  const args = { choice: "NO", now: t, fallbackHours: 4, date: "2026-10-14", startTime: "19:30:00" };
  assert.match(lateChangeWarning({ ...args, current: base })!, /owe the \$20/);
  assert.equal(
    lateChangeWarning({ ...args, current: { ...base, is_goalie: true } }),
    "You're changing within 4 hours of the skate.",
  );
  // A player on an older server has no hours → no confirm.
  assert.equal(lateChangeWarning({ ...args, fallbackHours: undefined, current: base }), null);
});

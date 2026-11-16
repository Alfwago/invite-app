import assert from "node:assert/strict";
import { test } from "node:test";

import type { MyRsvp } from "./api/types.ts";
import { eventStarted, isUnanswered, pendingInviteCount } from "./inviteBadge.ts";

const seeded = { status: "NO", responded_at: null } as unknown as MyRsvp;
const answered = { status: "NO", responded_at: "2026-11-16T12:00:00Z" } as unknown as MyRsvp;
const now = new Date(2026, 10, 22, 9, 0); // Sun Nov 22, 9:00 local

const ev = (over: Record<string, unknown> = {}) => ({
  status: "OPEN" as const,
  my_rsvp: seeded,
  date: "2026-11-22",
  start_time: "10:30:00",
  is_past: false,
  ...over,
});

test("seeded NO with no responded_at is unanswered; an answered NO isn't; no invite isn't", () => {
  assert.equal(isUnanswered(seeded), true);
  assert.equal(isUnanswered(answered), false);
  assert.equal(isUnanswered(null), false);
});

test("a skate has started once its start time passes", () => {
  assert.equal(eventStarted(ev(), now), false);
  assert.equal(eventStarted(ev(), new Date(2026, 10, 22, 10, 30)), true);
});

test("no start time: started once its day is over", () => {
  assert.equal(eventStarted(ev({ start_time: null }), new Date(2026, 10, 22, 23, 59)), false);
  assert.equal(eventStarted(ev({ start_time: null }), new Date(2026, 10, 23, 0, 0)), true);
});

test("is_past always counts as started", () => {
  assert.equal(eventStarted(ev({ is_past: true }), now), true);
});

test("badge counts open, unanswered, upcoming invites only", () => {
  const events = [
    ev(), // counts
    ev({ my_rsvp: answered }),
    ev({ my_rsvp: null }), // not invited
    ev({ status: "CLOSED" }),
    ev({ date: "2026-11-15" }), // last week, never answered: drops off
    ev({ start_time: "08:00:00" }), // today, already started
  ];
  assert.equal(pendingInviteCount(events as never, now), 1);
});

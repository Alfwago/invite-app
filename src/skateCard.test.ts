import assert from "node:assert/strict";
import { test } from "node:test";

import type { HomeData } from "./api/types.ts";
import { CARD_END_AFTER_MS, CARD_LEAD_MS, skateCardFromHome } from "./skateCard.ts";

const START = new Date("2026-10-05T21:30:00").getTime();

function home(overrides: Record<string, unknown> = {}, teams: unknown = null): HomeData {
  return {
    notices: [],
    nights: [],
    custom_events: [],
    latest_app_version: "",
    team_assignment: teams,
    next_skate: {
      id: 7,
      display_name: "Monday Hockey",
      logo_key: "Monday",
      date: "2026-10-05",
      start_time: "21:30:00",
      my_rsvp: { status: "YES" },
      roster: { skaters: 14, goalies: 1, capacity: 16, goalies_needed: 2 },
      ...overrides,
    },
  } as unknown as HomeData;
}

test("inside the window: the card with counts and no jersey yet", () => {
  assert.deepEqual(skateCardFromHome(home(), START - 60_000), {
    eventId: 7,
    name: "Monday Hockey",
    startsAt: START / 1000,
    logo: "Monday",
    myStatus: "YES",
    skaters: 14,
    goalies: 1,
    capacity: 16,
    goaliesNeeded: 2,
  });
});

test("outside the window: nothing to do", () => {
  assert.equal(skateCardFromHome(home(), START - CARD_LEAD_MS - 1), "none");
  assert.equal(skateCardFromHome(home(), START + CARD_END_AFTER_MS), "none");
});

test("no start time or no skate: nothing to do", () => {
  assert.equal(skateCardFromHome(home({ start_time: null }), START), "none");
  const empty = { ...home(), next_skate: null } as HomeData;
  assert.equal(skateCardFromHome(empty, START), "none");
});

test("the viewer's own status rides along", () => {
  const card = skateCardFromHome(home({ my_rsvp: { status: "WAITLIST" } }), START) as { myStatus?: string };
  assert.equal(card.myStatus, "WAITLIST");
  const unanswered = skateCardFromHome(home({ my_rsvp: null }), START) as { myStatus?: string };
  assert.equal(unanswered.myStatus, "NO_RESPONSE");
});

test("a No takes the card down", () => {
  assert.deepEqual(skateCardFromHome(home({ my_rsvp: { status: "NO" } }), START), { end: 7 });
});

test("jersey only from this skate's published team", () => {
  const gold = { event_id: 7, team: "Gold", jersey: "Wear your gold jersey." };
  const card = skateCardFromHome(home({}, gold), START) as { team?: string; jersey?: string };
  assert.equal(card.team, "Gold");
  assert.equal(card.jersey, "Wear your gold jersey.");

  const other = skateCardFromHome(home({}, { ...gold, event_id: 99 }), START) as { team?: string };
  assert.equal(other.team, undefined);
});

test("a missing capacity is left off rather than sent as null", () => {
  const card = skateCardFromHome(
    home({ roster: { skaters: 3, goalies: 0, capacity: null, goalies_needed: 2 } }),
    START,
  ) as Record<string, unknown>;
  assert.equal("capacity" in card, false);
});

test("the board line comes from Home's next-skate board message", () => {
  const data = { ...home(), next_skate_board_message: { author: "Mike R.", text: "Spare stick?", at: 1_790_000_000 } };
  const card = skateCardFromHome(data as HomeData, START) as Record<string, unknown>;
  assert.equal(card.messageAuthor, "Mike R.");
  assert.equal(card.messageText, "Spare stick?");
  assert.equal(card.messageAt, 1_790_000_000);
  assert.equal("messageText" in (skateCardFromHome(home(), START) as object), false);
});

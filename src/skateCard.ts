// Pure card logic for src/hooks/useSkateCard.ts — no React Native imports,
// so it runs under `npm test`.

import type { SkateCardInput } from "../modules/skate-card/index.ts";
import type { HomeData } from "./api/types.ts";

// Keep in step with invite-server skate_card.py CARD_LEAD / CARD_END_AFTER.
export const CARD_LEAD_MS = 7 * 60 * 60 * 1000;
export const CARD_END_AFTER_MS = 60 * 60 * 1000;

/** The card for Home's next skate right now: show it, take it down (the
 *  player said No), or nothing to do (no skate / outside the window). */
export function skateCardFromHome(
  data: HomeData,
  now: number,
): SkateCardInput | { end: number } | "none" {
  const skate = data.next_skate;
  if (!skate?.start_time) return "none";

  // "YYYY-MM-DDTHH:MM:SS" with no offset parses as device-local time.
  const startsAtMs = new Date(`${skate.date}T${skate.start_time}`).getTime();
  if (Number.isNaN(startsAtMs)) return "none";
  if (now < startsAtMs - CARD_LEAD_MS || now >= startsAtMs + CARD_END_AFTER_MS) return "none";

  if (skate.my_rsvp?.status === "NO") return { end: skate.id };

  const card: SkateCardInput = {
    eventId: skate.id,
    name: skate.display_name,
    startsAt: Math.floor(startsAtMs / 1000),
    logo: skate.logo_key ?? "",
    myStatus: skate.my_rsvp?.status ?? "NO_RESPONSE",
    skaters: skate.roster.skaters,
    goalies: skate.roster.goalies,
  };
  if (skate.roster.capacity != null) card.capacity = skate.roster.capacity;
  if (skate.roster.goalies_needed != null) card.goaliesNeeded = skate.roster.goalies_needed;
  const teams = data.team_assignment;
  if (teams && teams.event_id === skate.id) {
    card.team = teams.team;
    card.jersey = teams.jersey;
  }
  const message = data.next_skate_board_message;
  if (message) {
    card.messageAuthor = message.author;
    card.messageText = message.text;
    card.messageAt = message.at;
  }
  return card;
}

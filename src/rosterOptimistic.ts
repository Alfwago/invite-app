// Pure helper for src/hooks/queries.ts useRosterAction — no React Native
// imports, so it runs under `npm test`.

import type { EventDetail, RosterAction } from "./api/types.ts";

/**
 * Present / paid ticks applied to the cached event right away, so the box
 * flips under the director's finger instead of after the round trip.
 * Returns null for every other roster action (those wait for the server).
 */
export function applyOptimisticRosterAction(event: EventDetail, body: RosterAction): EventDetail | null {
  const setOn = <T extends { present: boolean; paid: boolean }>(row: T, key: "present" | "paid", v: boolean): T =>
    ({ ...row, [key]: v });
  switch (body.action) {
    case "set_present":
    case "set_paid": {
      const key = body.action === "set_present" ? "present" : "paid";
      const v = body.action === "set_present" ? body.present : body.paid;
      if (body.player_id != null) {
        return {
          ...event,
          players: event.players.map((p) => (p.player_id === body.player_id ? setOn(p, key, v) : p)),
        };
      }
      if (body.day_player_id != null) {
        return {
          ...event,
          day_players: event.day_players.map((d) => (d.id === body.day_player_id ? setOn(d, key, v) : d)),
        };
      }
      return null;
    }
    case "guest_present":
    case "guest_paid": {
      const key = body.action === "guest_present" ? "present" : "paid";
      const v = body.action === "guest_present" ? body.present : body.paid;
      return {
        ...event,
        players: event.players.map((p) =>
          p.player_id === body.player_id
            ? { ...p, guests: p.guests.map((g, i) => (i === body.guest_index ? setOn(g, key, v) : g)) }
            : p,
        ),
      };
    }
    default:
      return null;
  }
}

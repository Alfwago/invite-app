import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import * as api from "@/src/api/endpoints";
import { API_BASE } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import type { HomeData, RosterStats } from "@/src/api/types";
import {
  addRsvpRequestListener,
  respondToRsvpRequest,
  updateWatchApplicationContext,
  watchConnectivitySupported,
  type WatchRsvpStatus,
} from "@/modules/watch-connectivity";

import { keys, useHome } from "./queries";

const RSVP_CHOICES: WatchRsvpStatus[] = ["YES", "NO", "MAYBE"];

/**
 * Watch <-> phone sync.
 *
 * Watch -> phone: an RSVP tap arrives as `onRsvpRequest`; performed through
 * the app's real submitRsvp path (the same api.submitRsvp that useRsvp —
 * src/hooks/queries.ts — calls), not a separate one, then replied to the
 * watch with the result.
 *
 * Phone -> watch: whenever Home's next skate / RSVP / jersey changes,
 * pushes the new snapshot to the watch as WCSession application context
 * (delivered even if the watch app isn't running right now).
 */
export function useWatchConnectivity() {
  const qc = useQueryClient();
  const home = useHome();
  const { token } = useAuth();

  useEffect(() => {
    if (!watchConnectivitySupported) return;

    const sub = addRsvpRequestListener(async ({ requestId, eventId, status }) => {
      if (!RSVP_CHOICES.includes(status)) {
        respondToRsvpRequest(requestId, false, "Unknown RSVP status");
        return;
      }
      try {
        const fresh = await api.submitRsvp(eventId, { status });
        qc.setQueryData(keys.event(eventId), fresh);
        qc.invalidateQueries({ queryKey: keys.event(eventId) });
        qc.invalidateQueries({ queryKey: keys.home }); // team_assignment / roster counts
        qc.invalidateQueries({ queryKey: ["events"] });
        respondToRsvpRequest(requestId, true);
      } catch (e) {
        respondToRsvpRequest(requestId, false, e instanceof Error ? e.message : "Couldn't save your RSVP.");
      }
    });

    return () => sub.remove();
  }, [qc]);

  // A ref (not query state) so an unrelated Home refetch that resolves to
  // the same payload doesn't re-push identical data to the watch.
  const lastSent = useRef<string | null>(null);
  useEffect(() => {
    if (!watchConnectivitySupported) return;
    // Signed out: an empty context (no nextSkate, no credentials) — the
    // watch drops its token and shows the no-skate state.
    if (!token) {
      if (lastSent.current !== null) {
        lastSent.current = null;
        updateWatchApplicationContext({ updatedAt: new Date().toISOString() });
      }
      return;
    }
    if (!home.data) return;
    const payload = {
      ...watchPayloadFromHome(home.data),
      // Lets the watch fetch /api/home/ itself (targets/watch/HomeFetcher.swift),
      // so it stays current while this app is closed.
      apiUrl: API_BASE,
      authToken: token,
    };
    // updatedAt changes every call — compare without it.
    const serialized = JSON.stringify({ ...payload, updatedAt: undefined });
    if (serialized === lastSent.current) return;
    lastSent.current = serialized;
    updateWatchApplicationContext(payload);
  }, [home.data, token]);
}

function watchPayloadFromHome(data: HomeData): Record<string, unknown> {
  const skate = data.next_skate;
  if (!skate) {
    // No key at all for `nextSkate`, not `null` — WCSession's application
    // context must be property-list safe and doesn't accept NSNull, and
    // Swift's Codable treats a missing key on an Optional as nil anyway.
    return { updatedAt: new Date().toISOString() };
  }

  const nextSkate: Record<string, unknown> = {
    eventId: skate.id,
    nightName: skate.night?.name ?? skate.display_name,
    date: skate.date,
    myRsvp: skate.my_rsvp?.status ?? "NO_RESPONSE",
  };
  if (skate.start_time) nextSkate.startTime = skate.start_time;
  if (data.team_assignment) {
    nextSkate.teamAssignment = {
      team: data.team_assignment.team,
      jersey: data.team_assignment.jersey,
    };
  }
  // Roster status is shown on the watch once the player has responded —
  // still sent unconditionally here so it's already on the watch the
  // moment they tap, no second push needed.
  if (skate.roster) nextSkate.rosterStats = rosterStatsPayload(skate.roster);

  return { nextSkate, updatedAt: new Date().toISOString() };
}

function rosterStatsPayload(roster: RosterStats): Record<string, unknown> {
  const out: Record<string, unknown> = {
    skaters: roster.skaters,
    goalies: roster.goalies,
    isFull: roster.is_full,
  };
  // Omit null-valued keys, not send `null` — see the nextSkate comment
  // above; WCSession's context doesn't accept NSNull.
  if (roster.capacity != null) out.capacity = roster.capacity;
  if (roster.goalies_needed != null) out.goaliesNeeded = roster.goalies_needed;
  if (roster.skater_spots_open != null) out.skaterSpotsOpen = roster.skater_spots_open;
  if (roster.goalie_spots_open != null) out.goalieSpotsOpen = roster.goalie_spots_open;
  return out;
}

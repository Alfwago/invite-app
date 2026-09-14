import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import * as api from "@/src/api/endpoints";
import type { HomeData } from "@/src/api/types";
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
    if (!watchConnectivitySupported || !home.data) return;
    const payload = watchPayloadFromHome(home.data);
    const serialized = JSON.stringify(payload);
    if (serialized === lastSent.current) return;
    lastSent.current = serialized;
    updateWatchApplicationContext(payload);
  }, [home.data]);
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

  return { nextSkate, updatedAt: new Date().toISOString() };
}

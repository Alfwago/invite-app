import { apiFetch } from "./client";
import type {
  CreateNextEventBody,
  EventDetail,
  EventPatchBody,
  EventSummary,
  Me,
  Night,
  RsvpBody,
  SendInvitesResult,
} from "./types";

// ---- Auth -----------------------------------------------------------------

export function login(username: string, password: string): Promise<{ token: string }> {
  return apiFetch("/api/auth/login/", {
    method: "POST",
    body: { username, password },
    anonymous: true,
  });
}

export function logout(): Promise<void> {
  return apiFetch("/api/auth/logout/", { method: "POST" });
}

export function fetchMe(signal?: AbortSignal): Promise<Me> {
  return apiFetch("/api/me/", { signal });
}

// ---- Nights --------------------------------------------------------------

export async function fetchNights(signal?: AbortSignal): Promise<Night[]> {
  const data = await apiFetch<{ nights: Night[] }>("/api/nights/", { signal });
  return data.nights;
}

// ---- Events (read) --------------------------------------------------------

export async function fetchEvents(
  opts: { past?: boolean } = {},
  signal?: AbortSignal,
): Promise<EventSummary[]> {
  const qs = opts.past ? "?past=1" : "";
  const data = await apiFetch<{ events: EventSummary[] }>(`/api/events/${qs}`, { signal });
  return data.events;
}

export function fetchEvent(id: number | string, signal?: AbortSignal): Promise<EventDetail> {
  return apiFetch(`/api/events/${id}/`, { signal });
}

// ---- Player RSVP ---------------------------------------------------------

export function submitRsvp(id: number | string, body: RsvpBody): Promise<EventDetail> {
  return apiFetch(`/api/events/${id}/rsvp/`, { method: "POST", body });
}

// ---- Director actions ---------------------------------------------------

export function createNextEvent(body: CreateNextEventBody): Promise<EventDetail> {
  return apiFetch("/api/events/next/", { method: "POST", body });
}

export function patchEvent(id: number | string, body: EventPatchBody): Promise<EventDetail> {
  return apiFetch(`/api/events/${id}/`, { method: "PATCH", body });
}

export function sendInvites(
  id: number | string,
  directorMessage?: string,
): Promise<SendInvitesResult> {
  return apiFetch(`/api/events/${id}/send-invites/`, {
    method: "POST",
    body: directorMessage !== undefined ? { director_message: directorMessage } : {},
  });
}

export function sendBatch(id: number | string): Promise<SendInvitesResult> {
  return apiFetch(`/api/events/${id}/send-batch/`, { method: "POST", body: {} });
}

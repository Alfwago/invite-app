import { apiFetch } from "./client";
import type {
  BoardMessage,
  CreateNextEventBody,
  EventCandidates,
  EventDetail,
  EventPatchBody,
  EventSummary,
  HomeData,
  LeagueNotice,
  Me,
  MessagesResponse,
  NewMessage,
  Night,
  RosterAction,
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

// ---- Home / notices / message board -------------------------------------

export function fetchHome(signal?: AbortSignal): Promise<HomeData> {
  return apiFetch("/api/home/", { signal });
}

export async function fetchNotices(signal?: AbortSignal): Promise<LeagueNotice[]> {
  const data = await apiFetch<{ notices: LeagueNotice[] }>("/api/notices/", { signal });
  return data.notices;
}

export async function fetchBoards(signal?: AbortSignal): Promise<Night[]> {
  const data = await apiFetch<{ boards: Night[] }>("/api/boards/", { signal });
  return data.boards;
}

export function fetchMessages(
  board: number | null,
  signal?: AbortSignal,
): Promise<MessagesResponse> {
  const qs = board != null ? `?board=${board}` : "";
  return apiFetch(`/api/messages/${qs}`, { signal });
}

export function postMessage(msg: NewMessage): Promise<BoardMessage> {
  if (msg.imageUri) {
    const form = new FormData();
    form.append("body", msg.body);
    if (msg.board != null) form.append("board", String(msg.board));
    const name = msg.imageUri.split("/").pop() || "photo.jpg";
    const ext = name.split(".").pop()?.toLowerCase();
    const type = ext === "png" ? "image/png" : "image/jpeg";
    // React Native's FormData file shape:
    form.append("image", { uri: msg.imageUri, name, type } as unknown as Blob);
    return apiFetch("/api/messages/", { method: "POST", form });
  }
  return apiFetch("/api/messages/", {
    method: "POST",
    body: { body: msg.body, board: msg.board },
  });
}

export function deleteMessage(id: number): Promise<void> {
  return apiFetch(`/api/messages/${id}/`, { method: "DELETE" });
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

// ---- Director roster admin ---------------------------------------------

export function fetchCandidates(
  id: number | string,
  signal?: AbortSignal,
): Promise<EventCandidates> {
  return apiFetch(`/api/events/${id}/candidates/`, { signal });
}

/** One roster edit; the server returns the fresh event. */
export function rosterAction(
  id: number | string,
  body: RosterAction,
): Promise<EventDetail> {
  return apiFetch(`/api/events/${id}/roster/`, { method: "POST", body });
}

export function deleteEvent(id: number | string): Promise<void> {
  return apiFetch(`/api/events/${id}/`, { method: "DELETE" });
}

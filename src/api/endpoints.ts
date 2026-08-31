import { apiFetch } from "./client";
import type {
  BoardMessage,
  BoardsResponse,
  CreateNextEventBody,
  EventCandidates,
  EventDetail,
  EventPatchBody,
  EventPreset,
  EventSummary,
  HomeData,
  LeagueNotice,
  Me,
  MessagesResponse,
  NewMessage,
  Night,
  PenaltySeverity,
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

export function fetchBoards(signal?: AbortSignal): Promise<BoardsResponse> {
  return apiFetch("/api/boards/", { signal });
}

export function fetchMessages(
  board: number | null,
  signal?: AbortSignal,
): Promise<MessagesResponse> {
  const qs = board != null ? `?board=${board}` : "";
  return apiFetch(`/api/messages/${qs}`, { signal });
}

function imagePart(uri: string) {
  const name = uri.split("/").pop() || "photo.jpg";
  const ext = name.split(".").pop()?.toLowerCase();
  const type = ext === "png" ? "image/png" : "image/jpeg";
  return { uri, name, type } as unknown as Blob;
}

export function postMessage(msg: NewMessage): Promise<BoardMessage> {
  if (msg.imageUri) {
    const form = new FormData();
    form.append("body", msg.body);
    if (msg.board != null) form.append("board", String(msg.board));
    if (msg.notify) form.append("notify", "true");
    form.append("image", imagePart(msg.imageUri));
    return apiFetch("/api/messages/", { method: "POST", form });
  }
  return apiFetch("/api/messages/", {
    method: "POST",
    body: { body: msg.body, board: msg.board, notify: msg.notify ?? false },
  });
}

export function editMessage(id: number, body?: string, imageUri?: string): Promise<BoardMessage> {
  if (imageUri) {
    const form = new FormData();
    if (body != null) form.append("body", body);
    form.append("image", imagePart(imageUri));
    return apiFetch(`/api/messages/${id}/`, { method: "PATCH", form });
  }
  return apiFetch(`/api/messages/${id}/`, { method: "PATCH", body: { body } });
}

export function reactToMessage(id: number, emoji: string): Promise<BoardMessage> {
  return apiFetch(`/api/messages/${id}/react/`, { method: "POST", body: { emoji } });
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

// ---- Penalty box / invite schedule / header image --------------------

export function addPenaltyBox(
  id: number | string,
  body: { player_id: number; severity?: PenaltySeverity; delay_hours?: number; reason?: string },
): Promise<EventDetail> {
  return apiFetch(`/api/events/${id}/penalty-box/`, { method: "POST", body });
}

export function removePenaltyBox(
  id: number | string,
  playerId: number,
): Promise<EventDetail> {
  return apiFetch(`/api/events/${id}/penalty-box/?player_id=${playerId}`, {
    method: "DELETE",
  });
}

export function scheduleInvites(
  id: number | string,
  sendAtIso: string,
): Promise<EventDetail> {
  return apiFetch(`/api/events/${id}/schedule/`, {
    method: "POST",
    body: { send_at: sendAtIso },
  });
}

export function clearInviteSchedule(id: number | string): Promise<EventDetail> {
  return apiFetch(`/api/events/${id}/schedule/`, { method: "DELETE" });
}

export function clearHeaderImage(id: number | string): Promise<EventDetail> {
  return apiFetch(`/api/events/${id}/header-image/`, { method: "DELETE" });
}

export function setHeaderImage(
  id: number | string,
  imageUri: string,
): Promise<EventDetail> {
  const form = new FormData();
  const name = imageUri.split("/").pop() || "header.jpg";
  const ext = name.split(".").pop()?.toLowerCase();
  const type = ext === "png" ? "image/png" : "image/jpeg";
  form.append("image", { uri: imageUri, name, type } as unknown as Blob);
  return apiFetch(`/api/events/${id}/header-image/`, { method: "POST", form });
}

// ---- Night event-setup presets --------------------------------------

export async function fetchPresets(
  nightId: number,
  signal?: AbortSignal,
): Promise<EventPreset[]> {
  const data = await apiFetch<{ presets: EventPreset[] }>(
    `/api/nights/${nightId}/presets/`,
    { signal },
  );
  return data.presets;
}

export function savePreset(
  eventId: number | string,
  body: { name: string; is_default?: boolean },
): Promise<EventPreset> {
  return apiFetch(`/api/events/${eventId}/presets/`, { method: "POST", body });
}

export function updatePreset(
  presetId: number,
  body: { name?: string; is_default?: boolean; from_event_id?: number },
): Promise<EventPreset> {
  return apiFetch(`/api/presets/${presetId}/`, { method: "PATCH", body });
}

export function deletePreset(presetId: number): Promise<void> {
  return apiFetch(`/api/presets/${presetId}/`, { method: "DELETE" });
}

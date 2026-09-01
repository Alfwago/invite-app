import { apiFetch } from "./client";
import type {
  BoardMessage,
  BoardsResponse,
  CreateNextEventBody,
  EventCandidates,
  EventDetail,
  EventMessage,
  EventMessagesResponse,
  EventPatchBody,
  EventPreset,
  EventSummary,
  HomeData,
  LeagueNotice,
  Me,
  MessagesResponse,
  NewMessage,
  Night,
  NightMembersResponse,
  PenaltySeverity,
  DMConversation,
  DMThread,
  PendingApproval,
  Poll,
  PlayerDetail,
  PlayersResponse,
  SaveTeamsBody,
  TeamEvent,
  TeamHistoryEntry,
  TeamRosterPlayer,
  ProfilePatch,
  RatingPatch,
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

/** "Forgot password" — sends a reset link to the address if it matches an account. */
export function requestPasswordResetAnon(email: string): Promise<{ sent: boolean }> {
  return apiFetch("/api/auth/password-reset/", {
    method: "POST",
    body: { email },
    anonymous: true,
  });
}

export function fetchMe(signal?: AbortSignal): Promise<Me> {
  return apiFetch("/api/me/", { signal });
}

export function updateMe(patch: ProfilePatch): Promise<Me> {
  return apiFetch("/api/me/", { method: "PATCH", body: patch });
}

export function requestPasswordReset(): Promise<{ sent: boolean }> {
  return apiFetch("/api/me/password-reset/", { method: "POST", body: {} });
}

export function resendVerification(): Promise<{ sent: boolean; already_verified?: boolean }> {
  return apiFetch("/api/me/resend-verification/", { method: "POST", body: {} });
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

// ---- League notice management (president) ---------------------------

export async function fetchManageNotices(signal?: AbortSignal): Promise<LeagueNotice[]> {
  const data = await apiFetch<{ notices: LeagueNotice[] }>("/api/notices/manage/", { signal });
  return data.notices;
}

export function createNotice(body: {
  message: string;
  is_active?: boolean;
  sort_order?: number;
}): Promise<LeagueNotice> {
  return apiFetch("/api/notices/manage/", { method: "POST", body });
}

export function updateNotice(
  id: number,
  body: { message?: string; is_active?: boolean; sort_order?: number },
): Promise<LeagueNotice> {
  return apiFetch(`/api/notices/${id}/`, { method: "PATCH", body });
}

export function deleteNotice(id: number): Promise<void> {
  return apiFetch(`/api/notices/${id}/`, { method: "DELETE" });
}

// ---- Skate-group (night) membership --------------------------------

export function fetchNightMembers(
  nightId: number,
  signal?: AbortSignal,
): Promise<NightMembersResponse> {
  return apiFetch(`/api/nights/${nightId}/players/`, { signal });
}

export function addNightMembers(
  nightId: number,
  playerIds: number[],
): Promise<NightMembersResponse> {
  return apiFetch(`/api/nights/${nightId}/players/`, {
    method: "POST",
    body: { player_ids: playerIds },
  });
}

export function removeNightMember(
  nightId: number,
  playerId: number,
): Promise<NightMembersResponse> {
  return apiFetch(`/api/nights/${nightId}/players/?player_id=${playerId}`, {
    method: "DELETE",
  });
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

// ---- Per-event message thread ---------------------------------------

export function fetchEventMessages(
  eventId: number | string,
  signal?: AbortSignal,
): Promise<EventMessagesResponse> {
  return apiFetch(`/api/events/${eventId}/messages/`, { signal });
}

export function postEventMessage(
  eventId: number | string,
  body: string,
  imageUri?: string,
): Promise<EventMessage> {
  const path = `/api/events/${eventId}/messages/`;
  if (imageUri) {
    const form = new FormData();
    form.append("body", body);
    form.append("image", imagePart(imageUri));
    return apiFetch(path, { method: "POST", form });
  }
  return apiFetch(path, { method: "POST", body: { body } });
}

export function editEventMessage(
  eventId: number | string,
  mid: number,
  body?: string,
  imageUri?: string,
): Promise<EventMessage> {
  const path = `/api/events/${eventId}/messages/${mid}/`;
  if (imageUri) {
    const form = new FormData();
    if (body != null) form.append("body", body);
    form.append("image", imagePart(imageUri));
    return apiFetch(path, { method: "PATCH", form });
  }
  return apiFetch(path, { method: "PATCH", body: { body } });
}

export function reactEventMessage(
  eventId: number | string,
  mid: number,
  emoji: string,
): Promise<EventMessage> {
  return apiFetch(`/api/events/${eventId}/messages/${mid}/react/`, {
    method: "POST",
    body: { emoji },
  });
}

export function deleteEventMessage(eventId: number | string, mid: number): Promise<void> {
  return apiFetch(`/api/events/${eventId}/messages/${mid}/`, { method: "DELETE" });
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

// ---- Player directory + skill ratings (director) ---------------------

export function fetchPlayers(
  params: { night?: number | null; goalies?: boolean; q?: string } = {},
  signal?: AbortSignal,
): Promise<PlayersResponse> {
  const qs = new URLSearchParams();
  if (params.night != null) qs.set("night", String(params.night));
  if (params.goalies) qs.set("goalies", "1");
  if (params.q?.trim()) qs.set("q", params.q.trim());
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiFetch(`/api/players/${suffix}`, { signal });
}

export function fetchPlayer(id: number, signal?: AbortSignal): Promise<PlayerDetail> {
  return apiFetch(`/api/players/${id}/`, { signal });
}

export function savePlayerRatings(
  id: number,
  body: RatingPatch,
): Promise<PlayerDetail | { proposed: unknown }> {
  return apiFetch(`/api/players/${id}/ratings/`, { method: "PATCH", body });
}



// ---- Team Generator (director) --------------------------------------

export async function fetchTeamEvents(signal?: AbortSignal): Promise<TeamEvent[]> {
  const data = await apiFetch<{ events: TeamEvent[] }>("/api/teams/events/", { signal });
  return data.events;
}

export async function fetchTeamRoster(
  eventId: number,
  signal?: AbortSignal,
): Promise<TeamRosterPlayer[]> {
  const data = await apiFetch<{ players: TeamRosterPlayer[] }>(
    `/api/teams/events/${eventId}/players/`,
    { signal },
  );
  return data.players;
}

export async function fetchTeamAllPlayers(
  night?: number | null,
  signal?: AbortSignal,
): Promise<TeamRosterPlayer[]> {
  const qs = night != null ? `?night=${night}` : "";
  const data = await apiFetch<{ players: TeamRosterPlayer[] }>(`/api/teams/players/${qs}`, { signal });
  return data.players;
}

export async function fetchTeamHistory(
  eventId: number,
  signal?: AbortSignal,
): Promise<TeamHistoryEntry[]> {
  const data = await apiFetch<{ history: TeamHistoryEntry[] }>(
    `/api/teams/events/${eventId}/history/`,
    { signal },
  );
  return data.history;
}

export function saveTeamHistory(
  eventId: number,
  body: SaveTeamsBody,
): Promise<TeamHistoryEntry> {
  return apiFetch(`/api/teams/events/${eventId}/history/`, { method: "POST", body });
}

export function deleteTeamHistory(historyId: number): Promise<void> {
  return apiFetch(`/api/teams/history/${historyId}/`, { method: "DELETE" });
}

// ---- Player approval queue (director) -----------------------------

export async function fetchApprovals(signal?: AbortSignal): Promise<PendingApproval[]> {
  const data = await apiFetch<{ pending: PendingApproval[] }>("/api/approvals/", { signal });
  return data.pending;
}

export async function approvePlayer(profileId: number): Promise<PendingApproval[]> {
  const data = await apiFetch<{ pending: PendingApproval[] }>(`/api/approvals/${profileId}/`, {
    method: "POST",
    body: { action: "approve" },
  });
  return data.pending;
}

// ---- Polls (player) ----------------------------------------------

export async function fetchPolls(signal?: AbortSignal): Promise<Poll[]> {
  const data = await apiFetch<{ polls: Poll[] }>("/api/polls/", { signal });
  return data.polls;
}

export function votePoll(pollId: number, answers: Record<number, number>): Promise<Poll> {
  return apiFetch(`/api/polls/${pollId}/vote/`, { method: "POST", body: { answers } });
}

export function dismissPoll(pollId: number): Promise<{ ok: boolean }> {
  return apiFetch(`/api/polls/${pollId}/dismiss/`, { method: "POST", body: {} });
}

// ---- Direct messages / inbox (player) ---------------------------

export async function fetchInbox(
  signal?: AbortSignal,
): Promise<{ conversations: DMConversation[]; unread_total: number }> {
  return apiFetch("/api/dm/", { signal });
}

export function fetchDmRecipients(
  q: string,
  signal?: AbortSignal,
): Promise<{ players: { id: number; name: string }[] }> {
  const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  return apiFetch(`/api/dm/recipients/${qs}`, { signal });
}

export function fetchDmThread(who: number | "system", signal?: AbortSignal): Promise<DMThread> {
  return apiFetch(who === "system" ? "/api/dm/system/" : `/api/dm/${who}/`, { signal });
}

export function sendDm(userId: number, body: string): Promise<DMThread> {
  return apiFetch(`/api/dm/${userId}/`, { method: "POST", body: { body } });
}

export function deleteDmThread(who: number | "system"): Promise<void> {
  return apiFetch(who === "system" ? "/api/dm/system/" : `/api/dm/${who}/`, { method: "DELETE" });
}

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

import * as api from "@/src/api/endpoints";
import type {
  CreateNextEventBody,
  EventCandidates,
  EventDetail,
  EventPatchBody,
  EventSummary,
  HomeData,
  MessagesResponse,
  NewMessage,
  RosterAction,
  RsvpBody,
} from "@/src/api/types";

export const keys = {
  nights: ["nights"] as const,
  boards: ["boards"] as const,
  home: ["home"] as const,
  messages: (board: number | null) => ["messages", board ?? "main"] as const,
  events: (past: boolean) => ["events", { past }] as const,
  event: (id: number | string) => ["event", String(id)] as const,
};

export function useNights() {
  return useQuery({
    queryKey: keys.nights,
    queryFn: ({ signal }) => api.fetchNights(signal),
    staleTime: 5 * 60_000,
  });
}

export function useHome(): UseQueryResult<HomeData> {
  return useQuery({ queryKey: keys.home, queryFn: ({ signal }) => api.fetchHome(signal) });
}

export function useBoards() {
  return useQuery({
    queryKey: keys.boards,
    queryFn: ({ signal }) => api.fetchBoards(signal),
    staleTime: 5 * 60_000,
  });
}

export function useMessages(board: number | null): UseQueryResult<MessagesResponse> {
  return useQuery({
    queryKey: keys.messages(board),
    queryFn: ({ signal }) => api.fetchMessages(board, signal),
  });
}

export function usePostMessage(board: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (msg: NewMessage) => api.postMessage(msg),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.messages(board) }),
  });
}

export function useDeleteMessage(board: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteMessage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.messages(board) }),
  });
}

export function useEvents(past = false): UseQueryResult<EventSummary[]> {
  return useQuery({
    queryKey: keys.events(past),
    queryFn: ({ signal }) => api.fetchEvents({ past }, signal),
  });
}

export function useEvent(id: number | string): UseQueryResult<EventDetail> {
  return useQuery({
    queryKey: keys.event(id),
    queryFn: ({ signal }) => api.fetchEvent(id, signal),
    enabled: id != null && id !== "",
  });
}

/** After any write, refresh the affected event + the lists. */
function useInvalidateEvent(id: number | string) {
  const qc = useQueryClient();
  return (fresh?: EventDetail) => {
    if (fresh) qc.setQueryData(keys.event(id), fresh);
    qc.invalidateQueries({ queryKey: keys.event(id) });
    qc.invalidateQueries({ queryKey: ["events"] });
  };
}

export function useRsvp(id: number | string) {
  const invalidate = useInvalidateEvent(id);
  return useMutation({
    mutationFn: (body: RsvpBody) => api.submitRsvp(id, body),
    onSuccess: (fresh) => invalidate(fresh),
  });
}

export function usePatchEvent(id: number | string) {
  const invalidate = useInvalidateEvent(id);
  return useMutation({
    mutationFn: (body: EventPatchBody) => api.patchEvent(id, body),
    onSuccess: (fresh) => invalidate(fresh),
  });
}

export function useSendInvites(id: number | string) {
  const invalidate = useInvalidateEvent(id);
  return useMutation({
    mutationFn: (directorMessage?: string) => api.sendInvites(id, directorMessage),
    onSuccess: () => invalidate(),
  });
}

export function useSendBatch(id: number | string) {
  const invalidate = useInvalidateEvent(id);
  return useMutation({
    mutationFn: () => api.sendBatch(id),
    onSuccess: () => invalidate(),
  });
}

export function useCandidates(id: number | string, enabled = true) {
  return useQuery<EventCandidates>({
    queryKey: ["event", String(id), "candidates"],
    queryFn: ({ signal }) => api.fetchCandidates(id, signal),
    enabled: enabled && id != null && id !== "",
  });
}

export function useRosterAction(id: number | string) {
  const qc = useQueryClient();
  const invalidate = useInvalidateEvent(id);
  return useMutation({
    mutationFn: (body: RosterAction) => api.rosterAction(id, body),
    onSuccess: (fresh) => {
      invalidate(fresh);
      qc.invalidateQueries({ queryKey: ["event", String(id), "candidates"] });
    },
  });
}

export function useDeleteEvent(id: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteEvent(id),
    onSuccess: () => {
      qc.removeQueries({ queryKey: keys.event(id) });
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: keys.home });
    },
  });
}

export function useCreateNextEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateNextEventBody) => api.createNextEvent(body),
    onSuccess: (fresh) => {
      qc.setQueryData(keys.event(fresh.id), fresh);
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

import * as api from "@/src/api/endpoints";
import type {
  BoardMessage,
  CreateNextEventBody,
  EventMessagesResponse,
  EventCandidates,
  EventDetail,
  EventPatchBody,
  EventPreset,
  EventSummary,
  HomeData,
  MessagesResponse,
  NewMessage,
  PenaltySeverity,
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
    staleTime: 10_000,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.messages(board) });
      qc.invalidateQueries({ queryKey: keys.boards });
    },
  });
}

export function useEditMessage(board: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: number; body?: string; imageUri?: string }) =>
      api.editMessage(args.id, args.body, args.imageUri),
    onSuccess: (fresh) => patchMessageInCache(qc, board, fresh),
  });
}

export function useReactMessage(board: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: number; emoji: string }) =>
      api.reactToMessage(args.id, args.emoji),
    onSuccess: (fresh) => patchMessageInCache(qc, board, fresh),
  });
}

function patchMessageInCache(
  qc: ReturnType<typeof useQueryClient>,
  board: number | null,
  fresh: BoardMessage,
) {
  qc.setQueryData<MessagesResponse>(keys.messages(board), (prev) =>
    prev
      ? { ...prev, messages: prev.messages.map((m) => (m.id === fresh.id ? fresh : m)) }
      : prev,
  );
}

export function useDeleteMessage(board: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteMessage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.messages(board) }),
  });
}

// ---- Per-event message thread --------------------------------------

const eventMessagesKey = (id: number | string) => ["event", String(id), "messages"] as const;

export function useEventMessages(id: number | string) {
  return useQuery({
    queryKey: eventMessagesKey(id),
    queryFn: ({ signal }) => api.fetchEventMessages(id, signal),
    enabled: id != null && id !== "",
  });
}

function patchEventMessageInCache(
  qc: ReturnType<typeof useQueryClient>,
  id: number | string,
  fresh: BoardMessage,
) {
  qc.setQueryData<EventMessagesResponse>(
    eventMessagesKey(id),
    (prev) =>
      prev
        ? { ...prev, messages: prev.messages.map((m) => (m.id === fresh.id ? fresh : m)) }
        : prev,
  );
}

export function useEventThreadActions(id: number | string) {
  const qc = useQueryClient();
  const refreshThread = () => {
    qc.invalidateQueries({ queryKey: eventMessagesKey(id) });
    qc.invalidateQueries({ queryKey: keys.event(id) }); // messages_unread
  };
  return {
    post: useMutation({
      mutationFn: (args: { body: string; imageUri?: string }) =>
        api.postEventMessage(id, args.body, args.imageUri),
      onSuccess: refreshThread,
    }),
    edit: useMutation({
      mutationFn: (args: { mid: number; body?: string; imageUri?: string }) =>
        api.editEventMessage(id, args.mid, args.body, args.imageUri),
      onSuccess: (fresh) => patchEventMessageInCache(qc, id, fresh),
    }),
    react: useMutation({
      mutationFn: (args: { mid: number; emoji: string }) =>
        api.reactEventMessage(id, args.mid, args.emoji),
      onSuccess: (fresh) => patchEventMessageInCache(qc, id, fresh),
    }),
    remove: useMutation({
      mutationFn: (mid: number) => api.deleteEventMessage(id, mid),
      onSuccess: refreshThread,
    }),
  };
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
    qc.invalidateQueries({ queryKey: keys.home }); // Home cards carry roster counts
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

export function usePenaltyBox(id: number | string) {
  const invalidate = useInvalidateEvent(id);
  const qc = useQueryClient();
  const done = (fresh: EventDetail) => {
    invalidate(fresh);
    qc.invalidateQueries({ queryKey: ["event", String(id), "candidates"] });
  };
  return {
    add: useMutation({
      mutationFn: (body: {
        player_id: number;
        severity?: PenaltySeverity;
        delay_hours?: number;
        reason?: string;
      }) => api.addPenaltyBox(id, body),
      onSuccess: done,
    }),
    remove: useMutation({
      mutationFn: (playerId: number) => api.removePenaltyBox(id, playerId),
      onSuccess: done,
    }),
  };
}

export function useInviteSchedule(id: number | string) {
  const invalidate = useInvalidateEvent(id);
  return {
    set: useMutation({
      mutationFn: (sendAtIso: string) => api.scheduleInvites(id, sendAtIso),
      onSuccess: (fresh) => invalidate(fresh),
    }),
    clear: useMutation({
      mutationFn: () => api.clearInviteSchedule(id),
      onSuccess: (fresh) => invalidate(fresh),
    }),
  };
}

export function useHeaderImage(id: number | string) {
  const invalidate = useInvalidateEvent(id);
  return {
    set: useMutation({
      mutationFn: (imageUri: string) => api.setHeaderImage(id, imageUri),
      onSuccess: (fresh) => invalidate(fresh),
    }),
    clear: useMutation({
      mutationFn: () => api.clearHeaderImage(id),
      onSuccess: (fresh) => invalidate(fresh),
    }),
  };
}

export function usePresets(nightId: number | null | undefined) {
  return useQuery<EventPreset[]>({
    queryKey: ["presets", nightId],
    queryFn: ({ signal }) => api.fetchPresets(nightId as number, signal),
    enabled: nightId != null,
  });
}

export function usePresetMutations(eventId: number | string, nightId: number | null | undefined) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["presets", nightId] });
    qc.invalidateQueries({ queryKey: keys.event(eventId) });
  };
  return {
    save: useMutation({
      mutationFn: (body: { name: string; is_default?: boolean }) =>
        api.savePreset(eventId, body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: (args: {
        presetId: number;
        body: { name?: string; is_default?: boolean; from_event_id?: number };
      }) => api.updatePreset(args.presetId, args.body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (presetId: number) => api.deletePreset(presetId),
      onSuccess: invalidate,
    }),
  };
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

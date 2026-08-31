import { Stack, useLocalSearchParams } from "expo-router";

import { ApiError } from "@/src/api/client";
import { ChatThread } from "@/src/components/chat/ChatThread";
import { useEvent, useEventMessages, useEventThreadActions } from "@/src/hooks/queries";

export default function EventThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useEvent(id);
  const thread = useEventMessages(id);
  const actions = useEventThreadActions(id);

  const data = thread.data;

  return (
    <>
      <Stack.Screen
        options={{ title: event.data ? `${event.data.display_name} · Messages` : "Messages" }}
      />
      <ChatThread
        messages={data?.messages ?? []}
        reactionChoices={data?.reaction_choices ?? ["👍", "😂", "🔥", "👎"]}
        emojiGroups={data?.emoji_groups ?? []}
        loading={thread.isLoading}
        error={thread.isError}
        errorMessage={thread.error instanceof ApiError ? thread.error.detail : undefined}
        refreshing={thread.isRefetching}
        onRefresh={thread.refetch}
        onRetry={thread.refetch}
        sending={actions.post.isPending || actions.edit.isPending}
        emptyLabel="No messages on this skate yet"
        placeholder="Message everyone on this skate…"
        onSend={(body, imageUri) => actions.post.mutateAsync({ body, imageUri })}
        onEdit={(mid, body, imageUri) => actions.edit.mutateAsync({ mid, body, imageUri })}
        onDelete={(mid) => actions.remove.mutate(mid)}
        onReact={(mid, emoji) => actions.react.mutate({ mid, emoji })}
      />
    </>
  );
}

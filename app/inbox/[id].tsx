import { useRef, useState } from "react";
import {
  Alert,
  type AlertButton,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";

import { ApiError } from "@/src/api/client";
import type { DMMessage } from "@/src/api/types";
import { LinkText } from "@/src/components/LinkText";
import { ErrorState, Loading } from "@/src/components/ui";
import { formatDateTime } from "@/src/format";
import { useDmMessageActions, useDmThread, useSendDm } from "@/src/hooks/queries";
import { colors, font, radius, spacing } from "@/src/theme";

const FALLBACK_EMOJI = ["👍", "😂", "🔥", "👎"];

function errText(e: unknown): string {
  if (e instanceof ApiError) return e.detail;
  return "Something went wrong.";
}

export default function DmThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const who: number | "system" = id === "system" ? "system" : Number(id);
  const router = useRouter();
  const query = useDmThread(who);
  const send = useSendDm(who === "system" ? 0 : who);
  const actions = useDmMessageActions(who);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: number; original: string } | null>(null);
  const listRef = useRef<FlatList<DMMessage>>(null);
  const headerHeight = useHeaderHeight();

  const thread = query.data;

  if (query.isLoading) return <Loading label="Loading…" />;
  if (query.isError || !thread) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.detail : "Couldn't load."}
        onRetry={() => query.refetch()}
      />
    );
  }

  const canReply = who !== "system" && thread.can_reply;
  const emoji = thread.reaction_choices?.length ? thread.reaction_choices : FALLBACK_EMOJI;

  async function submit() {
    const body = draft.trim();
    if (!body) return;
    if (editing) {
      const { id: mid } = editing;
      setEditing(null);
      setDraft("");
      try {
        await actions.edit.mutateAsync({ messageId: mid, body });
      } catch {
        setEditing({ id: mid, original: body });
        setDraft(body);
      }
      return;
    }
    if (who === "system") return;
    setDraft("");
    try {
      await send.mutateAsync(body);
      listRef.current?.scrollToEnd({ animated: true });
    } catch {
      setDraft(body);
    }
  }

  function react(msg: DMMessage) {
    Alert.alert("React", undefined, [
      ...emoji.map((e) => ({
        text: e,
        onPress: () => actions.react.mutate({ messageId: msg.id, emoji: e }),
      })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  }

  function longPress(msg: DMMessage) {
    if (msg.is_system) return;
    const buttons: AlertButton[] = [{ text: "React…", onPress: () => react(msg) }];
    if (msg.can_edit) {
      buttons.push({
        text: "Edit",
        onPress: () => {
          setEditing({ id: msg.id, original: msg.body });
          setDraft(msg.body);
        },
      });
    }
    if (msg.mine) {
      buttons.push({
        text: "Delete for me",
        style: "destructive",
        onPress: () =>
          Alert.alert("Delete message?", "This only removes it from your view.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => actions.remove.mutate(msg.id),
            },
          ]),
      });
    }
    buttons.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Message", undefined, buttons);
  }

  return (
    <>
      <Stack.Screen options={{ title: thread.other_name }} />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={headerHeight}
      >
        <FlatList
          ref={listRef}
          data={thread.messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <Bubble
              msg={item}
              onEvent={(eid) => router.push(`/event/${eid}` as never)}
              onLongPress={() => longPress(item)}
              onToggleReaction={(e) => actions.react.mutate({ messageId: item.id, emoji: e })}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>No messages yet.</Text>}
        />

        {send.isError || actions.edit.isError ? (
          <Text style={styles.error}>{errText(send.error ?? actions.edit.error)}</Text>
        ) : null}

        {editing ? (
          <View style={styles.editBanner}>
            <Text style={styles.editBannerText}>Editing message</Text>
            <Pressable
              hitSlop={8}
              onPress={() => {
                setEditing(null);
                setDraft("");
              }}
            >
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : null}

        {canReply || editing ? (
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              placeholder={editing ? "Edit message…" : "Message…"}
              placeholderTextColor={colors.textMuted}
              value={draft}
              onChangeText={setDraft}
              multiline
            />
            <Pressable
              onPress={submit}
              disabled={!draft.trim() || send.isPending || actions.edit.isPending}
              style={[
                styles.sendBtn,
                (!draft.trim() || send.isPending || actions.edit.isPending) && styles.sendOff,
              ]}
            >
              <Ionicons name={editing ? "checkmark" : "arrow-up"} size={20} color={colors.goldText} />
            </Pressable>
          </View>
        ) : who !== "system" ? (
          <Text style={styles.readonly}>You can&apos;t reply to this player.</Text>
        ) : null}
      </KeyboardAvoidingView>
    </>
  );
}

function Bubble({
  msg,
  onEvent,
  onLongPress,
  onToggleReaction,
}: {
  msg: DMMessage;
  onEvent: (eventId: number) => void;
  onLongPress: () => void;
  onToggleReaction: (emoji: string) => void;
}) {
  if (msg.is_system) {
    return (
      <Pressable
        style={styles.systemRow}
        disabled={msg.event_id == null}
        onPress={() => msg.event_id != null && onEvent(msg.event_id)}
      >
        <Text style={styles.systemText}>{msg.body}</Text>
        <Text style={styles.systemWhen}>{formatDateTime(msg.created_at)}</Text>
      </Pressable>
    );
  }
  return (
    <View style={[styles.bubbleRow, msg.mine ? styles.mineRow : styles.theirRow]}>
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={250}
        style={[styles.bubble, msg.mine ? styles.mine : styles.theirs]}
      >
        <LinkText
          style={[styles.bubbleText, msg.mine && styles.bubbleTextMine]}
          linkStyle={msg.mine ? styles.linkMine : undefined}
        >
          {msg.body}
        </LinkText>
      </Pressable>

      {msg.reactions.length > 0 ? (
        <View style={[styles.reactions, msg.mine ? styles.reactionsMine : undefined]}>
          {msg.reactions.map((r) => (
            <Pressable
              key={r.emoji}
              onPress={() => onToggleReaction(r.emoji)}
              style={[styles.pill, r.mine && styles.pillMine]}
            >
              <Text style={styles.pillText}>
                {r.emoji} {r.count}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text style={styles.when}>
        {formatDateTime(msg.created_at)}
        {msg.edited_at ? " · edited" : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },
  empty: { color: colors.textMuted, textAlign: "center", padding: spacing.xl },
  error: { color: colors.red, fontSize: font.xs, paddingHorizontal: spacing.md },
  systemRow: {
    backgroundColor: colors.cardRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  systemText: { color: colors.text, fontSize: font.sm },
  systemWhen: { color: colors.textMuted, fontSize: font.xs },
  bubbleRow: { maxWidth: "82%", gap: 2 },
  mineRow: { alignSelf: "flex-end", alignItems: "flex-end" },
  theirRow: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: { borderRadius: 16, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  mine: { backgroundColor: colors.gold, borderTopRightRadius: 5 },
  theirs: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderTopLeftRadius: 5,
  },
  bubbleText: { color: colors.text, fontSize: 15, lineHeight: 20 },
  bubbleTextMine: { color: colors.goldText },
  linkMine: { color: colors.goldText, textDecorationLine: "underline", fontWeight: "700" },
  reactions: { flexDirection: "row", gap: 4, marginTop: 2 },
  reactionsMine: { justifyContent: "flex-end" },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  pillMine: { borderColor: colors.gold, backgroundColor: colors.goldDim },
  pillText: { color: colors.text, fontSize: font.xs },
  when: { color: colors.textMuted, fontSize: 10 },
  editBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editBannerText: { color: colors.textMuted, fontSize: font.xs },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    maxHeight: 120,
    fontSize: 15,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  sendOff: { opacity: 0.4 },
  readonly: {
    color: colors.textMuted,
    fontSize: font.xs,
    textAlign: "center",
    padding: spacing.md,
  },
});

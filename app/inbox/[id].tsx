import { useRef, useState } from "react";
import {
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

import { ApiError } from "@/src/api/client";
import type { DMMessage } from "@/src/api/types";
import { ErrorState, Loading } from "@/src/components/ui";
import { formatDateTime } from "@/src/format";
import { useDmThread, useSendDm } from "@/src/hooks/queries";
import { colors, font, radius, spacing } from "@/src/theme";

export default function DmThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const who: number | "system" = id === "system" ? "system" : Number(id);
  const router = useRouter();
  const query = useDmThread(who);
  const send = useSendDm(who === "system" ? 0 : who);
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<DMMessage>>(null);

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

  async function submit() {
    const body = draft.trim();
    if (!body || who === "system") return;
    setDraft("");
    try {
      await send.mutateAsync(body);
      listRef.current?.scrollToEnd({ animated: true });
    } catch (e) {
      setDraft(body);
      // error shown inline below
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: thread.other_name }} />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          ref={listRef}
          data={thread.messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => <Bubble msg={item} onEvent={(eid) => router.push(`/event/${eid}` as never)} />}
          ListEmptyComponent={<Text style={styles.empty}>No messages yet.</Text>}
        />

        {send.isError ? (
          <Text style={styles.error}>
            {send.error instanceof ApiError ? send.error.detail : "Couldn't send."}
          </Text>
        ) : null}

        {canReply ? (
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              placeholder="Message…"
              placeholderTextColor={colors.textMuted}
              value={draft}
              onChangeText={setDraft}
              multiline
            />
            <Pressable
              onPress={submit}
              disabled={!draft.trim() || send.isPending}
              style={[styles.sendBtn, (!draft.trim() || send.isPending) && styles.sendOff]}
            >
              <Ionicons name="arrow-up" size={20} color={colors.goldText} />
            </Pressable>
          </View>
        ) : who !== "system" ? (
          <Text style={styles.readonly}>You can&apos;t reply to this player.</Text>
        ) : null}
      </KeyboardAvoidingView>
    </>
  );
}

function Bubble({ msg, onEvent }: { msg: DMMessage; onEvent: (eventId: number) => void }) {
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
      <View style={[styles.bubble, msg.mine ? styles.mine : styles.theirs]}>
        <Text style={[styles.bubbleText, msg.mine && styles.bubbleTextMine]}>{msg.body}</Text>
      </View>
      <Text style={styles.when}>{formatDateTime(msg.created_at)}</Text>
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
  when: { color: colors.textMuted, fontSize: 10 },
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

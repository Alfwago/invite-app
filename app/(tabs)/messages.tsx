import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { ApiError } from "@/src/api/client";
import type { BoardMessage } from "@/src/api/types";
import { Button, EmptyState, ErrorState, Loading } from "@/src/components/ui";
import { useBoards, useDeleteMessage, useMessages, usePostMessage } from "@/src/hooks/queries";
import { colors, radius, spacing } from "@/src/theme";

const MAIN = null;

export default function MessagesScreen() {
  const boardsQuery = useBoards();
  const [board, setBoard] = useState<number | null>(MAIN);

  const messagesQuery = useMessages(board);
  const post = usePostMessage(board);
  const del = useDeleteMessage(board);

  const [draft, setDraft] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>();

  const boards = useMemo(() => boardsQuery.data ?? [], [boardsQuery.data]);

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to attach a picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  async function send() {
    if (!draft.trim() && !imageUri) return;
    try {
      await post.mutateAsync({ body: draft.trim() || "(photo)", board, imageUri });
      setDraft("");
      setImageUri(undefined);
    } catch (e) {
      Alert.alert("Couldn't post", e instanceof ApiError ? e.detail : "Try again.");
    }
  }

  function confirmDelete(id: number) {
    Alert.alert("Delete message?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => del.mutate(id) },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.boardBar}>
        <BoardChip label="Main" active={board === MAIN} onPress={() => setBoard(MAIN)} />
        {boards.map((b) => (
          <BoardChip
            key={b.id}
            label={b.name}
            active={board === b.id}
            onPress={() => setBoard(b.id)}
          />
        ))}
      </View>

      <MessageList
        query={messagesQuery}
        onDelete={confirmDelete}
      />

      {imageUri ? (
        <View style={styles.previewRow}>
          <Image source={{ uri: imageUri }} style={styles.preview} />
          <Pressable onPress={() => setImageUri(undefined)}>
            <Text style={styles.removePhoto}>Remove</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.composer}>
        <Pressable onPress={pickImage} style={styles.attachBtn}>
          <Text style={styles.attachText}>📷</Text>
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder="Message…"
          placeholderTextColor={colors.textMuted}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <Button
          label="Send"
          onPress={send}
          loading={post.isPending}
          disabled={!draft.trim() && !imageUri}
          style={styles.sendBtn}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageList({
  query,
  onDelete,
}: {
  query: ReturnType<typeof useMessages>;
  onDelete: (id: number) => void;
}) {
  if (query.isLoading) return <Loading label="Loading messages…" />;
  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.detail : "Couldn't load messages."}
        onRetry={() => query.refetch()}
      />
    );
  }
  const messages = query.data?.messages ?? [];
  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={messages}
      keyExtractor={(m) => String(m.id)}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={query.refetch}
          tintColor={colors.gold}
        />
      }
      ListEmptyComponent={<EmptyState message="No messages yet. Start the conversation." />}
      renderItem={({ item }) => <MessageBubble msg={item} onDelete={onDelete} />}
    />
  );
}

function MessageBubble({ msg, onDelete }: { msg: BoardMessage; onDelete: (id: number) => void }) {
  return (
    <View style={[styles.bubble, msg.mine && styles.bubbleMine]}>
      <View style={styles.bubbleHead}>
        <Text style={styles.author}>
          {msg.author_name}
          {msg.author_is_director ? " ⭐" : ""}
        </Text>
        <Text style={styles.time}>{new Date(msg.created_at).toLocaleString()}</Text>
      </View>
      {msg.body ? <Text style={styles.body}>{msg.body}</Text> : null}
      {msg.image_url ? (
        <Image source={{ uri: msg.image_url }} style={styles.image} resizeMode="cover" />
      ) : null}
      {msg.can_delete ? (
        <Pressable onPress={() => onDelete(msg.id)} hitSlop={8}>
          <Text style={styles.delete}>Delete</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function BoardChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: colors.gold, borderColor: colors.gold }]}
    >
      <Text style={[styles.chipText, active && { color: colors.goldText }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  boardBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  chip: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  chipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  list: { flex: 1 },
  listContent: { padding: spacing.md, gap: spacing.sm },
  bubble: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  bubbleMine: { borderColor: colors.gold },
  bubbleHead: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  author: { color: colors.text, fontWeight: "700", fontSize: 13, flexShrink: 1 },
  time: { color: colors.textMuted, fontSize: 11 },
  body: { color: colors.text, fontSize: 15 },
  image: { width: "100%", height: 200, borderRadius: radius.sm, marginTop: spacing.xs },
  delete: { color: colors.red, fontSize: 12, marginTop: spacing.xs },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  preview: { width: 48, height: 48, borderRadius: radius.sm },
  removePhoto: { color: colors.red, fontSize: 13 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  attachBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  attachText: { fontSize: 22 },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    maxHeight: 120,
    fontSize: 15,
  },
  sendBtn: { paddingHorizontal: spacing.md, minHeight: 40 },
});

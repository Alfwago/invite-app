import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/src/api/client";
import { ChatThread } from "@/src/components/chat/ChatThread";
import {
  keys,
  useBoards,
  useDeleteMessage,
  useEditMessage,
  useMessages,
  usePostMessage,
  useReactMessage,
} from "@/src/hooks/queries";
import { colors, radius, spacing } from "@/src/theme";

const MAIN = null;

export default function MessagesScreen() {
  const qc = useQueryClient();
  const boardsQuery = useBoards();
  const [board, setBoard] = useState<number | null>(MAIN);

  const messagesQuery = useMessages(board);
  const post = usePostMessage(board);
  const edit = useEditMessage(board);
  const del = useDeleteMessage(board);
  const react = useReactMessage(board);

  const [emailGroup, setEmailGroup] = useState(false);

  const boards = useMemo(() => boardsQuery.data?.boards ?? [], [boardsQuery.data]);
  const data = messagesQuery.data;

  // Opening a board marks it read server-side — refresh the unread badges.
  useEffect(() => {
    if (messagesQuery.isSuccess) qc.invalidateQueries({ queryKey: keys.boards });
  }, [messagesQuery.dataUpdatedAt, messagesQuery.isSuccess, qc]);

  const canEmail = !!data?.can_email;

  // Size the night tiles so exactly 6 fit one row edge-to-edge: strip the
  // board-bar padding and the 5 inter-tile gaps, divide by 6. Fewer than 6
  // groups stay this size and center (boardRow wraps + centers).
  const { width } = useWindowDimensions();
  const tileSize = Math.floor((width - spacing.md * 2 - spacing.sm * 5) / 6);

  return (
    <View style={styles.screen}>
      <View style={styles.boardBar}>
        <BoardChip
          label="Main"
          active={board === MAIN}
          onPress={() => setBoard(MAIN)}
          badge={boardsQuery.data?.unread_main ?? 0}
          full
        />
        <View style={styles.boardRow}>
          {boards.map((b) => (
            <BoardChip
              key={b.id}
              label={b.name}
              imageUrl={b.image_url}
              active={board === b.id}
              badge={b.unread ?? 0}
              size={tileSize}
              onPress={() => setBoard(b.id)}
            />
          ))}
        </View>
      </View>

      <ChatThread
        messages={data?.messages ?? []}
        reactionChoices={data?.reaction_choices ?? ["👍", "😂", "🔥", "👎"]}
        emojiGroups={data?.emoji_groups ?? []}
        loading={messagesQuery.isLoading}
        error={messagesQuery.isError}
        errorMessage={
          messagesQuery.error instanceof ApiError ? messagesQuery.error.detail : undefined
        }
        refreshing={messagesQuery.isRefetching}
        onRefresh={messagesQuery.refetch}
        onRetry={messagesQuery.refetch}
        sending={post.isPending || edit.isPending}
        emptyLabel="No messages"
        accessory={
          canEmail ? (
            <Pressable
              onPress={() => setEmailGroup((v) => !v)}
              style={[styles.emailToggle, emailGroup && styles.emailToggleOn]}
            >
              <Ionicons
                name={emailGroup ? "mail" : "mail-outline"}
                size={14}
                color={emailGroup ? colors.goldText : colors.textMuted}
              />
              <Text style={[styles.emailToggleText, emailGroup && styles.emailToggleTextOn]}>
                {emailGroup ? "Will email the group" : "Email the group too"}
              </Text>
            </Pressable>
          ) : null
        }
        onSend={async (body, imageUri) => {
          await post.mutateAsync({ body, board, imageUri, notify: emailGroup });
          setEmailGroup(false);
        }}
        onEdit={(id, body, imageUri) => edit.mutateAsync({ id, body, imageUri })}
        onDelete={(id) => del.mutate(id)}
        onReact={(id, emoji) => react.mutate({ id, emoji })}
      />
    </View>
  );
}

function UnreadDot({ count, style }: { count: number; style?: object }) {
  if (count <= 0) return null;
  return (
    <View style={[styles.unreadDot, style]}>
      <Text style={styles.unreadDotText}>{count > 9 ? "9+" : count}</Text>
    </View>
  );
}

function BoardChip({
  label,
  active,
  onPress,
  full,
  imageUrl,
  badge = 0,
  size = 56,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  full?: boolean;
  imageUrl?: string | null;
  badge?: number;
  size?: number;
}) {
  if (!full && imageUrl) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityLabel={label}
        style={{ width: size, height: size }}
      >
        <View style={[styles.boardTile, active && styles.boardTileActive]}>
          <Image source={{ uri: imageUrl }} style={styles.boardTileImg} resizeMode="cover" />
        </View>
        <UnreadDot count={badge} style={styles.unreadDotCorner} />
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={[
        styles.chip,
        full ? styles.chipFull : styles.chipHalf,
        active && { backgroundColor: colors.gold, borderColor: colors.gold },
      ]}
    >
      <Text
        style={[styles.chipText, full && styles.chipTextFull, active && { color: colors.goldText }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <UnreadDot count={badge} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  boardBar: {
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  boardRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipFull: { width: "100%", paddingVertical: spacing.md },
  chipHalf: { flexGrow: 1, flexBasis: "45%" },
  boardTile: {
    width: "100%",
    height: "100%",
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: colors.cardRaised,
  },
  boardTileActive: { borderColor: colors.gold },
  boardTileImg: { width: "100%", height: "100%" },
  chipText: { color: colors.text, fontWeight: "600", fontSize: 13, flexShrink: 1 },
  chipTextFull: { fontSize: 15, fontWeight: "800", letterSpacing: 0.5 },
  unreadDot: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDotText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  unreadDotCorner: { position: "absolute", top: -6, right: -6 },

  emailToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emailToggleOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  emailToggleText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  emailToggleTextOn: { color: colors.goldText },
});

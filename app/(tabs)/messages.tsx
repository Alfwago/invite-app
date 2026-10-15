import { useEffect, useMemo, useState } from "react";
import {
  Image,
  type ImageSourcePropType,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/src/api/client";
import { boardA11yLabel, boardTileImage, boardTileLayout, nightShortLabel } from "@/src/boardTiles";
import { Tap } from "@/src/components/Tap";
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
import { colors, font, radius, spacing } from "@/src/theme";
import { usePullToRefresh } from "@/src/hooks/usePullToRefresh";

const MAIN = null;
const WORDMARK = require("@/assets/brand/wordmark.png");
const TILE_BG = "#161616"; // board tile, a step above colors.cardRaised
const BADGE_RED = "#d93a3f"; // white on it = 4.5:1

export default function MessagesScreen() {
  const qc = useQueryClient();
  const boardsQuery = useBoards();
  const [board, setBoard] = useState<number | null>(MAIN);

  const messagesQuery = useMessages(board);

  const pull = usePullToRefresh(messagesQuery.refetch);
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
  const activeNight = board === MAIN ? null : boards.find((b) => b.id === board);

  // Owner's "Option A" (2026-10-15): Main is the first tile (the OBH
  // wordmark), then one per skate group — equal tiles spread evenly across
  // the bar, wrapping into balanced, grid-aligned rows (boardTileLayout).
  const { width } = useWindowDimensions();
  const tiles: TileProps[] = [
    {
      key: "main",
      name: "Main",
      shortLabel: "Main",
      image: WORDMARK,
      active: board === MAIN,
      badge: boardsQuery.data?.unread_main ?? 0,
      onPress: () => setBoard(MAIN),
    },
    ...boards.map((b) => {
      const url = boardTileImage(b);
      return {
        key: String(b.id),
        name: b.name,
        shortLabel: nightShortLabel(b),
        image: url ? { uri: url } : null,
        active: board === b.id,
        badge: b.unread ?? 0,
        onPress: () => setBoard(b.id),
      };
    }),
  ];
  const layout = boardTileLayout(width - spacing.md * 2, tiles.length);
  const rows: TileProps[][] = [];
  for (let i = 0; i < tiles.length; i += layout.columns) rows.push(tiles.slice(i, i + layout.columns));

  return (
    <View style={styles.screen}>
      <View style={styles.boardBar}>
        {rows.map((row, i) => (
          <View
            key={i}
            style={[styles.boardRow, { gap: layout.gap, paddingHorizontal: layout.gap }]}
          >
            {row.map(({ key, ...tile }) => (
              <BoardTile key={key} {...tile} size={layout.size} />
            ))}
          </View>
        ))}
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
        refreshing={pull.refreshing}
        onRefresh={pull.onRefresh}
        onRetry={messagesQuery.refetch}
        sending={post.isPending || edit.isPending}
        emptyLabel={
          activeNight
            ? `Nothing on the ${activeNight.name} board yet. Say hi to the group.`
            : "No messages"
        }
        mentionBoard={board}
        accessory={
          canEmail ? (
            <Tap
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
            </Tap>
          ) : null
        }
        onSend={async (body, imageUri, mentionIds) => {
          await post.mutateAsync({ body, board, imageUri, notify: emailGroup, mentionIds });
          setEmailGroup(false);
        }}
        onEdit={(id, body, imageUri, mentionIds) =>
          edit.mutateAsync({ id, body, imageUri, mentionIds })
        }
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

type TileProps = {
  key: string;
  name: string;
  shortLabel: string;
  image: ImageSourcePropType | null;
  active: boolean;
  badge: number;
  onPress: () => void;
};

/**
 * A board: its logo on a dark rounded tile (gold border + gold wash when
 * open) with a short label underneath — Main shows the OBH wordmark. A group
 * with no logo gets the same tile with its short label in gold. Logos come
 * from the server's tile_image_url (made for dark backgrounds) — on an older
 * server, the original white-background art, still fitted whole ("contain").
 */
function BoardTile({
  name,
  shortLabel,
  image,
  active,
  badge,
  size,
  onPress,
}: Omit<TileProps, "key"> & { size: number }) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={boardA11yLabel(name, badge)}
      style={{ width: size, alignItems: "center" }}
    >
      <View style={{ width: size, height: size }}>
        <View style={[styles.boardTile, active && styles.boardTileActive]}>
          {image ? (
            <Image source={image} style={styles.boardTileImg} resizeMode="contain" />
          ) : (
            <Text style={styles.boardTileText} numberOfLines={1} adjustsFontSizeToFit>
              {shortLabel}
            </Text>
          )}
        </View>
        <UnreadDot count={badge} style={styles.unreadDotCorner} />
      </View>
      <Text style={[styles.boardTileLabel, active && styles.boardTileLabelActive]} numberOfLines={1}>
        {shortLabel}
      </Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  boardBar: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  boardRow: { flexDirection: "row" },
  // Option 1 (owner, 2026-10-14). Active swaps 1px border + 4 padding for
  // 2px + 3, so the logo doesn't move when a tile is picked.
  boardTile: {
    width: "100%",
    height: "100%",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    overflow: "hidden",
    backgroundColor: TILE_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  boardTileActive: {
    borderWidth: 2,
    borderColor: colors.gold,
    padding: 3,
    backgroundColor: colors.goldDim,
  },
  boardTileImg: { width: "100%", height: "100%" },
  boardTileText: { color: colors.gold, fontSize: 15, fontWeight: "800", paddingHorizontal: 2 },
  boardTileLabel: { marginTop: 4, color: colors.textMuted, fontSize: font.xs, fontWeight: "600" },
  boardTileLabelActive: { color: colors.gold },
  // 2px ring in the page colour so the badge reads apart from the tile's
  // edge; darker red than colors.red so white digits pass 4.5:1 (Amy).
  unreadDot: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.bg,
    backgroundColor: BADGE_RED,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDotText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  unreadDotCorner: { position: "absolute", top: -7, right: -7 },

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

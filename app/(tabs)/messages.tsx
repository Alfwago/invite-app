import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  type ImageSourcePropType,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/src/api/client";
import type { BoardId } from "@/src/api/types";
import {
  boardA11yLabel,
  boardTileImage,
  boardTileRow,
  nightShortLabel,
  offscreenUnread,
  ROW_TILE,
  scrollToShow,
} from "@/src/boardTiles";
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
const DIRECTORS = "directors" as const;
const TILE_BG = "#161616"; // board tile, a step above colors.cardRaised
const BADGE_RED = "#d93a3f"; // white on it = 4.5:1

export default function MessagesScreen() {
  const qc = useQueryClient();
  const boardsQuery = useBoards();
  const [board, setBoard] = useState<BoardId>(MAIN);

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
  const activeNight = board === MAIN || board === DIRECTORS ? null : boards.find((b) => b.id === board);
  // The Director board (server 0.41.0+, owner 2026-11-17): directors, Night
  // Directors and Assistants only. null/missing = not shown.
  const directorsBoard = boardsQuery.data?.directors_board ?? null;

  // Main is the full-width bar across the top (owner, 2026-10-15: the app
  // keeps the bar; the website has the Main tile). Below it, one tile per
  // skate group in a single row (boardTileRow).
  const { width } = useWindowDimensions();
  const mainUnread = boardsQuery.data?.unread_main ?? 0;
  const tiles: TileProps[] = boards.map((b) => {
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
  });
  // One row, never a wrapped grid (owner 2026-11-17; Art + Amy): spread out
  // when it all fits, else a sideways-scrolling row of 52pt tiles.
  const rowSpec = boardTileRow(width - spacing.md * 2, tiles.length);
  const keyboardUp = useKeyboardUp();

  const rowRef = useRef<ScrollView>(null);
  const [scrollX, setScrollX] = useState(0);
  const [viewW, setViewW] = useState(0);
  const [contentW, setContentW] = useState(0);
  const pad = spacing.md;
  // The row unmounts while the keyboard is up and comes back at the start.
  useEffect(() => {
    if (keyboardUp) setScrollX(0);
  }, [keyboardUp]);
  const activeIndex = tiles.findIndex((t) => t.active);
  // Keep the open board's tile in view (also when a push opens it).
  useEffect(() => {
    if (!rowSpec.scroll || activeIndex < 0 || viewW <= 0) return;
    const x = scrollToShow(activeIndex, rowSpec.size, rowSpec.gap, pad, scrollX, viewW);
    if (x !== scrollX) rowRef.current?.scrollTo({ x, animated: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the board or row changes
  }, [activeIndex, viewW, rowSpec.scroll, keyboardUp]);
  const hidden = rowSpec.scroll
    ? offscreenUnread(tiles.map((t) => t.badge), rowSpec.size, rowSpec.gap, pad, scrollX, viewW)
    : { left: null, right: null };
  const moreLeft = rowSpec.scroll && scrollX > 1;
  const moreRight = rowSpec.scroll && contentW > scrollX + viewW + 1;
  function revealTile(index: number) {
    if (!rowSpec.scroll) return;
    const x = scrollToShow(index, rowSpec.size, rowSpec.gap, pad, scrollX, viewW);
    rowRef.current?.scrollTo({ x, animated: true });
  }
  const boardLabel =
    board === MAIN ? "Main board" : board === DIRECTORS ? "Directors board" : (activeNight?.name ?? "Board");

  return (
    <View style={styles.screen}>
      {keyboardUp ? (
        // Typing: the boards give the thread their room; one line says
        // which board this goes to. Tap it to put the keyboard away (Amy).
        <Tap
          feedback="row"
          onPress={() => Keyboard.dismiss()}
          accessibilityRole="button"
          accessibilityLabel={`Posting to ${boardLabel}. Tap to show all boards`}
          style={styles.compactBar}
        >
          {board === DIRECTORS ? (
            <Ionicons name="lock-closed" size={12} color={colors.gold} />
          ) : null}
          <Text style={styles.compactBarText} numberOfLines={1}>
            {boardLabel}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </Tap>
      ) : (
      <View style={styles.boardBar}>
        <View style={styles.barRow}>
          <Tap
            onPress={() => setBoard(MAIN)}
            accessibilityRole="button"
            accessibilityState={{ selected: board === MAIN }}
            accessibilityLabel={boardA11yLabel("Main", mainUnread)}
            style={[styles.mainBar, board === MAIN && styles.mainBarActive]}
          >
            <Text style={[styles.mainBarText, board === MAIN && styles.mainBarTextActive]}>Main</Text>
            {mainUnread > 0 ? <UnreadDot count={mainUnread} style={styles.unreadDotMain} /> : null}
          </Tap>
          {directorsBoard ? (
            <Tap
              onPress={() => setBoard(DIRECTORS)}
              accessibilityRole="button"
              accessibilityState={{ selected: board === DIRECTORS }}
              accessibilityLabel={`${boardA11yLabel("Directors", directorsBoard.unread)}, directors only`}
              style={[styles.mainBar, styles.directorsBar, board === DIRECTORS && styles.mainBarActive]}
            >
              <Ionicons
                name="lock-closed"
                size={13}
                color={board === DIRECTORS ? colors.gold : colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.mainBarText, board === DIRECTORS && styles.mainBarTextActive]}>
                Directors
              </Text>
              {directorsBoard.unread > 0 ? (
                <UnreadDot count={directorsBoard.unread} style={styles.unreadDotMain} />
              ) : null}
            </Tap>
          ) : null}
        </View>
        {tiles.length === 0 ? null : !rowSpec.scroll ? (
          <View
            style={[
              styles.boardRow,
              { gap: rowSpec.layout.gap, paddingHorizontal: rowSpec.layout.gap },
            ]}
          >
            {tiles.map(({ key, ...tile }) => (
              <BoardTile key={key} {...tile} size={rowSpec.layout.size} />
            ))}
          </View>
        ) : (
          <View style={styles.scrollWrap}>
            <ScrollView
              ref={rowRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={32}
              onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
              onLayout={(e) => setViewW(e.nativeEvent.layout.width)}
              onContentSizeChange={(w) => setContentW(w)}
              contentContainerStyle={[styles.scrollRow, { gap: rowSpec.gap, paddingHorizontal: pad }]}
            >
              {tiles.map(({ key, ...tile }) => (
                <BoardTile key={key} {...tile} size={rowSpec.size} />
              ))}
            </ScrollView>
            {moreLeft ? (
              <EdgeFade side="left" unread={hidden.left} onPress={revealTile} names={tiles} />
            ) : null}
            {moreRight ? (
              <EdgeFade side="right" unread={hidden.right} onPress={revealTile} names={tiles} />
            ) : null}
          </View>
        )}
      </View>
      )}

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
          board === DIRECTORS
            ? "Nothing on the Directors board yet. Only directors see what's posted here."
            : activeNight
              ? `Nothing on the ${activeNight.name} board yet. Say hi to the group.`
              : "No messages"
        }
        mentionBoard={board}
        canReply={!!data?.can_reply}
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
        onSend={async (body, imageUri, mentionIds, replyTo) => {
          await post.mutateAsync({ body, board, imageUri, notify: emailGroup, mentionIds, replyTo });
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

/** True while the on-screen keyboard is up. */
function useKeyboardUp(): boolean {
  const [up, setUp] = useState(false);
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const a = Keyboard.addListener(showEvt, () => setUp(true));
    const b = Keyboard.addListener(hideEvt, () => setUp(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return up;
}

const FADE_STEPS = [0.35, 0.65, 0.85, 1];

/**
 * The scrolling row's edge: a fade into the page that says "more this way"
 * (Art), and a red dot when a board out that way has unread posts (Amy).
 * Tapping it brings that board into view.
 */
function EdgeFade({
  side,
  unread,
  onPress,
  names,
}: {
  side: "left" | "right";
  unread: number | null;
  onPress: (index: number) => void;
  names: { name: string }[];
}) {
  const steps = side === "right" ? FADE_STEPS : [...FADE_STEPS].reverse();
  const fade = (
    <View style={styles.fadeStrips} pointerEvents="none">
      {steps.map((o) => (
        <View key={o} style={{ flex: 1, backgroundColor: colors.bg, opacity: o }} />
      ))}
    </View>
  );
  return (
    <View style={[styles.edge, side === "right" ? { right: 0 } : { left: 0 }]} pointerEvents="box-none">
      {fade}
      {unread !== null ? (
        <Tap
          feedback="icon"
          hitSlop={10}
          onPress={() => onPress(unread)}
          accessibilityRole="button"
          accessibilityLabel={`Unread messages in ${names[unread]?.name ?? "another board"}`}
          style={styles.edgeMark}
        >
          <Ionicons
            name={side === "right" ? "chevron-forward" : "chevron-back"}
            size={15}
            color={colors.gold}
          />
          <View style={styles.edgeDot} />
        </Tap>
      ) : null}
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
 * A skate group's board: its logo on a dark rounded tile (gold border + gold
 * wash when open) with a short label underneath. A group
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
  // The scrolling row runs edge to edge; paddingTop leaves room for the
  // tiles' corner badges (top: -7) inside the scroll view.
  scrollWrap: { marginHorizontal: -spacing.md },
  scrollRow: { paddingTop: 7 },
  edge: {
    position: "absolute",
    top: 7,
    height: ROW_TILE,
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  fadeStrips: { ...StyleSheet.absoluteFillObject, flexDirection: "row" },
  // A dark disc so the arrow reads over a logo; the red dot = unread that way.
  edgeMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  edgeDot: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.bg,
    backgroundColor: BADGE_RED,
  },
  // Keyboard up: one line in place of the boards.
  compactBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  compactBarText: { color: colors.gold, fontSize: 14, fontWeight: "800", flexShrink: 1 },
  // Main, and for directors the Directors board beside it (0.41.0).
  barRow: { flexDirection: "row", gap: spacing.md },
  // Director-only: the red left border Card accent="director" uses.
  directorsBar: { borderLeftWidth: 4, borderLeftColor: colors.red },
  // Main: the full-width bar, in the tiles' language — dark with a 1px
  // border; open = 2px gold border, gold wash, gold text (padding gives
  // back the extra point so the text doesn't move).
  mainBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: TILE_BG,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  mainBarActive: {
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: colors.goldDim,
    paddingVertical: spacing.md - 1,
    paddingHorizontal: spacing.md - 1,
  },
  mainBarText: { color: colors.text, fontSize: 15, fontWeight: "800", letterSpacing: 0.5 },
  mainBarTextActive: { color: colors.gold },
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
  unreadDotMain: { position: "absolute", right: spacing.md },

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

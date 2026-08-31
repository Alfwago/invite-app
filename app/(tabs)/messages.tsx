import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/src/api/client";
import type { BoardMessage } from "@/src/api/types";
import { useAuth } from "@/src/auth/AuthContext";
import { ErrorState, Loading } from "@/src/components/ui";
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

const MAIN = null;

// ── time helpers ────────────────────────────────────────────────────────
function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, y)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
const GAP_MS = 60 * 60 * 1000; // show a time header when the break is > 1h

// ── screen ──────────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const boardsQuery = useBoards();
  const [board, setBoard] = useState<number | null>(MAIN);

  const messagesQuery = useMessages(board);
  const post = usePostMessage(board);
  const edit = useEditMessage(board);
  const del = useDeleteMessage(board);
  const react = useReactMessage(board);

  const [draft, setDraft] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [editing, setEditing] = useState<BoardMessage | null>(null);
  const [emailGroup, setEmailGroup] = useState(false);
  const [sheetFor, setSheetFor] = useState<BoardMessage | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const listRef = useRef<FlatList<BoardMessage>>(null);

  const boards = useMemo(() => boardsQuery.data?.boards ?? [], [boardsQuery.data]);
  const data = messagesQuery.data;

  // Opening a board marks it read server-side — refresh the unread badges.
  useEffect(() => {
    if (messagesQuery.isSuccess) {
      qc.invalidateQueries({ queryKey: keys.boards });
    }
  }, [messagesQuery.dataUpdatedAt, messagesQuery.isSuccess, qc]);
  const messages = data?.messages ?? [];
  const reactionChoices = data?.reaction_choices ?? ["👍", "😂", "🔥", "👎"];
  const emojiGroups = data?.emoji_groups ?? [];
  const canEmail = !!data?.can_email;

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to attach a picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  function resetComposer() {
    setDraft("");
    setImageUri(undefined);
    setEditing(null);
    setEmailGroup(false);
  }

  async function send() {
    const text = draft.trim();
    if (!text && !imageUri) return;
    try {
      if (editing) {
        await edit.mutateAsync({ id: editing.id, body: text, imageUri });
      } else {
        await post.mutateAsync({ body: text, board, imageUri, notify: emailGroup });
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
      resetComposer();
    } catch (e) {
      Alert.alert("Couldn't send", e instanceof ApiError ? e.detail : "Try again.");
    }
  }

  function closeSheet() {
    setSheetFor(null);
    setPickerOpen(false);
  }

  function startEdit(msg: BoardMessage) {
    setEditing(msg);
    setDraft(msg.body);
    setImageUri(undefined);
    closeSheet();
  }

  function confirmDelete(msg: BoardMessage) {
    closeSheet();
    Alert.alert("Delete message?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => del.mutate(msg.id) },
    ]);
  }

  function toggleReaction(msg: BoardMessage, emoji: string) {
    react.mutate({ id: msg.id, emoji });
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
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
              onPress={() => setBoard(b.id)}
            />
          ))}
        </View>
      </View>

      {messagesQuery.isLoading ? (
        <Loading label="Loading messages…" />
      ) : messagesQuery.isError ? (
        <ErrorState
          message={
            messagesQuery.error instanceof ApiError
              ? messagesQuery.error.detail
              : "Couldn't load messages."
          }
          onRetry={() => messagesQuery.refetch()}
        />
      ) : messages.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No messages</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={messages}
          inverted
          keyExtractor={(m) => String(m.id)}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={messagesQuery.isRefetching}
              onRefresh={messagesQuery.refetch}
              tintColor={colors.gold}
            />
          }
          renderItem={({ item, index }) => {
            const older = messages[index + 1]; // inverted: next index is older
            const showAuthor = !item.mine && older?.author_id !== item.author_id;
            const showTimeHeader =
              !older ||
              new Date(item.created_at).getTime() - new Date(older.created_at).getTime() > GAP_MS;
            return (
              <View>
                {showTimeHeader ? (
                  <Text style={styles.timeHeader}>
                    {dayLabel(item.created_at)} · {clockTime(item.created_at)}
                  </Text>
                ) : null}
                <MessageRow
                  msg={item}
                  showAuthor={showAuthor}
                  onLongPress={() => setSheetFor(item)}
                  onToggleReaction={(emoji) => toggleReaction(item, emoji)}
                />
              </View>
            );
          }}
        />
      )}

      {editing ? (
        <View style={styles.editBanner}>
          <Ionicons name="pencil" size={14} color={colors.gold} />
          <Text style={styles.editBannerText}>Editing message</Text>
          <Pressable onPress={resetComposer} hitSlop={8}>
            <Text style={styles.editCancel}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      {imageUri ? (
        <View style={styles.previewRow}>
          <Image source={{ uri: imageUri }} style={styles.preview} />
          <Pressable onPress={() => setImageUri(undefined)} hitSlop={8}>
            <Text style={styles.removePhoto}>Remove</Text>
          </Pressable>
        </View>
      ) : null}

      {canEmail && !editing ? (
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
      ) : null}

      <View style={styles.composer}>
        <Pressable onPress={pickImage} style={styles.iconBtn} hitSlop={6}>
          <Ionicons name="image-outline" size={24} color={colors.textMuted} />
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder={editing ? "Edit message…" : "Message…"}
          placeholderTextColor={colors.textMuted}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <Pressable
          onPress={send}
          disabled={(!draft.trim() && !imageUri) || post.isPending || edit.isPending}
          style={[
            styles.sendBtn,
            (!draft.trim() && !imageUri) && styles.sendBtnOff,
          ]}
        >
          <Ionicons
            name={editing ? "checkmark" : "arrow-up"}
            size={20}
            color={colors.goldText}
          />
        </Pressable>
      </View>

      <Modal visible={!!sheetFor} transparent animationType="fade" onRequestClose={closeSheet}>
        <Pressable style={styles.sheetBackdrop} onPress={closeSheet}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {pickerOpen ? (
              <>
                <View style={styles.pickerHead}>
                  <Pressable onPress={() => setPickerOpen(false)} hitSlop={8}>
                    <Ionicons name="chevron-back" size={22} color={colors.text} />
                  </Pressable>
                  <Text style={styles.pickerTitle}>Pick a reaction</Text>
                  <View style={{ width: 22 }} />
                </View>
                <ScrollView style={styles.pickerScroll}>
                  {emojiGroups.map((g) => (
                    <View key={g.title}>
                      <Text style={styles.pickerGroup}>{g.title}</Text>
                      <View style={styles.pickerGrid}>
                        {g.emoji.map((emoji) => (
                          <Pressable
                            key={emoji}
                            onPress={() => {
                              if (sheetFor) toggleReaction(sheetFor, emoji);
                              closeSheet();
                            }}
                            style={styles.pickerCell}
                          >
                            <Text style={styles.pickerEmoji}>{emoji}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </>
            ) : (
              <>
                <View style={styles.reactRow}>
                  {reactionChoices.map((emoji) => {
                    const on = sheetFor?.reactions.some((r) => r.emoji === emoji && r.mine);
                    return (
                      <Pressable
                        key={emoji}
                        onPress={() => {
                          if (sheetFor) toggleReaction(sheetFor, emoji);
                          closeSheet();
                        }}
                        style={[styles.reactBig, on && styles.reactBigOn]}
                      >
                        <Text style={styles.reactBigText}>{emoji}</Text>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    onPress={() => setPickerOpen(true)}
                    style={[styles.reactBig, styles.reactPlus]}
                  >
                    <Ionicons name="add" size={24} color={colors.text} />
                  </Pressable>
                </View>
                {sheetFor?.can_edit ? (
                  <SheetButton
                    icon="pencil"
                    label="Edit"
                    onPress={() => sheetFor && startEdit(sheetFor)}
                  />
                ) : null}
                {sheetFor?.body ? (
                  <SheetButton icon="copy-outline" label="Copy text" onPress={closeSheet} />
                ) : null}
                {sheetFor?.can_delete ? (
                  <SheetButton
                    icon="trash-outline"
                    label="Delete"
                    danger
                    onPress={() => sheetFor && confirmDelete(sheetFor)}
                  />
                ) : null}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ── message row ─────────────────────────────────────────────────────────
function MessageRow({
  msg,
  showAuthor,
  onLongPress,
  onToggleReaction,
}: {
  msg: BoardMessage;
  showAuthor: boolean;
  onLongPress: () => void;
  onToggleReaction: (emoji: string) => void;
}) {
  const mine = msg.mine;
  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={styles.rowInner}>
        {showAuthor ? (
          <View style={styles.authorLine}>
            <Text style={styles.author}>{msg.author_name}</Text>
            {msg.author_is_director ? (
              <Ionicons name="star" size={11} color={colors.gold} />
            ) : null}
          </View>
        ) : null}

        <Pressable
          onLongPress={onLongPress}
          delayLongPress={250}
          style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}
        >
          {msg.image_url ? (
            <Image source={{ uri: msg.image_url }} style={styles.image} resizeMode="cover" />
          ) : null}
          {msg.body ? (
            <Text style={[styles.body, mine && styles.bodyMine]}>{msg.body}</Text>
          ) : null}
        </Pressable>

        {msg.reactions.length > 0 ? (
          <View style={[styles.reactions, mine && styles.reactionsMine]}>
            {msg.reactions.map((r) => (
              <Pressable
                key={r.emoji}
                onPress={() => onToggleReaction(r.emoji)}
                style={[styles.reactPill, r.mine && styles.reactPillOn]}
              >
                <Text style={styles.reactPillText}>
                  {r.emoji} {r.count}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function SheetButton({
  icon,
  label,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.sheetBtn}>
      <Ionicons name={icon} size={18} color={danger ? colors.red : colors.text} />
      <Text style={[styles.sheetBtnText, danger && { color: colors.red }]}>{label}</Text>
    </Pressable>
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
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  full?: boolean;
  imageUrl?: string | null;
  badge?: number;
}) {
  if (!full && imageUrl) {
    return (
      <Pressable onPress={onPress} accessibilityLabel={label} style={styles.boardTileWrap}>
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
  boardRow: { flexDirection: "row", gap: spacing.sm },
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
  boardTileWrap: { flex: 1, aspectRatio: 1 },
  boardTile: {
    flex: 1,
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

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.textMuted, fontSize: font.base, fontWeight: "600" },

  list: { flex: 1 },
  listContent: { padding: spacing.md, gap: 2 },
  timeHeader: {
    alignSelf: "center",
    color: colors.textMuted,
    fontSize: font.xs,
    fontWeight: "600",
    marginVertical: spacing.md,
  },

  row: { flexDirection: "row", marginVertical: 1 },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },
  rowInner: { maxWidth: "82%" },
  authorLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: spacing.md,
    marginBottom: 2,
    marginTop: spacing.xs,
  },
  author: { color: colors.textMuted, fontSize: font.xs, fontWeight: "700" },

  bubble: { borderRadius: 18, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, overflow: "hidden" },
  bubbleTheirs: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderTopLeftRadius: 6,
  },
  bubbleMine: { backgroundColor: colors.gold, borderTopRightRadius: 6 },
  body: { color: colors.text, fontSize: 15, lineHeight: 20 },
  bodyMine: { color: colors.goldText },
  image: {
    width: 220,
    height: 220,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: colors.cardRaised,
  },

  reactions: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 3, marginLeft: spacing.sm },
  reactionsMine: { justifyContent: "flex-end", marginRight: spacing.sm, marginLeft: 0 },
  reactPill: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  reactPillOn: { borderColor: colors.gold, backgroundColor: colors.goldDim },
  reactPillText: { color: colors.text, fontSize: 12, fontWeight: "600" },

  editBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  editBannerText: { color: colors.textMuted, fontSize: 13, flex: 1 },
  editCancel: { color: colors.gold, fontWeight: "700", fontSize: 13 },

  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  preview: { width: 52, height: 52, borderRadius: radius.sm },
  removePhoto: { color: colors.red, fontSize: 13 },

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

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  iconBtn: { paddingVertical: spacing.sm, alignItems: "center", justifyContent: "center" },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
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
  sendBtnOff: { opacity: 0.4 },

  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  reactRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  reactBig: { padding: spacing.sm, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  reactBigOn: { backgroundColor: colors.goldDim },
  reactBigText: { fontSize: 26 },
  reactPlus: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardRaised,
    width: 40,
    height: 40,
  },
  pickerHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  pickerTitle: { color: colors.text, fontWeight: "800", fontSize: font.base },
  pickerScroll: { maxHeight: 320 },
  pickerGroup: {
    color: colors.textMuted,
    fontSize: font.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  pickerGrid: { flexDirection: "row", flexWrap: "wrap" },
  pickerCell: { width: "12.5%", alignItems: "center", paddingVertical: 6 },
  pickerEmoji: { fontSize: 24 },
  sheetBtn: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  sheetBtnText: { color: colors.text, fontSize: 15, fontWeight: "600" },
});

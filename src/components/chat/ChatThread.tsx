import { useRef, useState, type ReactNode } from "react";
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

import { ApiError } from "@/src/api/client";
import type { ChatMessage, EmojiGroup } from "@/src/api/types";
import { ErrorState, Loading } from "@/src/components/ui";
import { colors, font, radius, spacing } from "@/src/theme";

const GAP_MS = 60 * 60 * 1000; // show a time header when the break is > 1h

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
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

export interface ChatThreadProps {
  messages: ChatMessage[];
  reactionChoices: string[];
  emojiGroups: EmojiGroup[];
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  onRetry?: () => void;
  sending?: boolean;
  emptyLabel?: string;
  placeholder?: string;
  /** Rendered just above the composer row (e.g. an "email the group" toggle). */
  accessory?: ReactNode;
  onSend: (body: string, imageUri?: string) => Promise<unknown>;
  onEdit: (id: number, body: string, imageUri?: string) => Promise<unknown>;
  onDelete: (id: number) => void;
  onReact: (id: number, emoji: string) => void;
}

export function ChatThread({
  messages,
  reactionChoices,
  emojiGroups,
  loading,
  error,
  errorMessage,
  refreshing,
  onRefresh,
  onRetry,
  sending,
  emptyLabel = "No messages",
  placeholder = "Message…",
  accessory,
  onSend,
  onEdit,
  onDelete,
  onReact,
}: ChatThreadProps) {
  const [draft, setDraft] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [sheetFor, setSheetFor] = useState<ChatMessage | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to attach a picture.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (!res.canceled) setImageUri(res.assets[0].uri);
  }

  function resetComposer() {
    setDraft("");
    setImageUri(undefined);
    setEditing(null);
  }

  async function send() {
    const text = draft.trim();
    if (!text && !imageUri) return;
    try {
      if (editing) {
        await onEdit(editing.id, text, imageUri);
      } else {
        await onSend(text, imageUri);
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
  function startEdit(msg: ChatMessage) {
    setEditing(msg);
    setDraft(msg.body);
    setImageUri(undefined);
    closeSheet();
  }
  function confirmDelete(msg: ChatMessage) {
    closeSheet();
    Alert.alert("Delete message?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(msg.id) },
    ]);
  }

  const disabled = (!draft.trim() && !imageUri) || sending;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {loading ? (
        <Loading label="Loading messages…" />
      ) : error ? (
        <ErrorState message={errorMessage ?? "Couldn't load messages."} onRetry={onRetry} />
      ) : messages.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>{emptyLabel}</Text>
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
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.gold}
              />
            ) : undefined
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
                  onToggleReaction={(emoji) => onReact(item.id, emoji)}
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

      {!editing ? accessory : null}

      <View style={styles.composer}>
        <Pressable onPress={pickImage} style={styles.iconBtn} hitSlop={6}>
          <Ionicons name="image-outline" size={24} color={colors.textMuted} />
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder={editing ? "Edit message…" : placeholder}
          placeholderTextColor={colors.textMuted}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <Pressable
          onPress={send}
          disabled={disabled}
          style={[styles.sendBtn, disabled && styles.sendBtnOff]}
        >
          <Ionicons name={editing ? "checkmark" : "arrow-up"} size={20} color={colors.goldText} />
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
                              if (sheetFor) onReact(sheetFor.id, emoji);
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
                          if (sheetFor) onReact(sheetFor.id, emoji);
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
                  <SheetButton icon="pencil" label="Edit" onPress={() => sheetFor && startEdit(sheetFor)} />
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

function MessageRow({
  msg,
  showAuthor,
  onLongPress,
  onToggleReaction,
}: {
  msg: ChatMessage;
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
          {msg.body ? <Text style={[styles.body, mine && styles.bodyMine]}>{msg.body}</Text> : null}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
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

  bubble: {
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: "hidden",
  },
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
  reactBig: {
    padding: spacing.sm,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
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

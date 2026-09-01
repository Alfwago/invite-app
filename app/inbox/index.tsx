import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { ApiError } from "@/src/api/client";
import * as api from "@/src/api/endpoints";
import { ErrorState, Loading } from "@/src/components/ui";
import { formatDateTime } from "@/src/format";
import { useInbox } from "@/src/hooks/queries";
import { colors, font, radius, spacing } from "@/src/theme";

export default function InboxScreen() {
  const router = useRouter();
  const query = useInbox();
  const [compose, setCompose] = useState(false);
  const convos = query.data?.conversations ?? [];

  return (
    <>
      <Stack.Screen
        options={{
          title: "Inbox",
          headerRight: () => (
            <Pressable onPress={() => setCompose(true)} hitSlop={10} style={styles.newBtn}>
              <Ionicons name="add" size={18} color={colors.goldText} />
              <Text style={styles.newBtnText}>New</Text>
            </Pressable>
          ),
        }}
      />
      <View style={styles.screen}>
        {query.isLoading ? (
          <Loading label="Loading…" />
        ) : query.isError ? (
          <ErrorState
            message={query.error instanceof ApiError ? query.error.detail : "Couldn't load."}
            onRetry={() => query.refetch()}
          />
        ) : convos.length === 0 ? (
          <Text style={styles.empty}>No messages yet. Tap ✎ to start one.</Text>
        ) : (
          <FlatList
            data={convos}
            keyExtractor={(c) => String(c.user_id ?? "system")}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() =>
                  router.push(`/inbox/${item.user_id ?? "system"}` as never)
                }
              >
                <View style={styles.avatar}>
                  <Ionicons
                    name={item.is_system ? "notifications" : "person"}
                    size={18}
                    color={colors.textMuted}
                  />
                </View>
                <View style={styles.rowMain}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.preview} numberOfLines={1}>
                    {item.last_body}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.when}>{formatDateTime(item.last_at)}</Text>
                  {item.unread > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.unread}</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            )}
          />
        )}
      </View>

      <ComposeModal
        visible={compose}
        onClose={() => setCompose(false)}
        onPick={(id) => {
          setCompose(false);
          router.push(`/inbox/${id}` as never);
        }}
      />
    </>
  );
}

function ComposeModal({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (id: number) => void;
}) {
  const [q, setQ] = useState("");
  const recipients = useQuery({
    queryKey: ["dm-recipients", q.trim()],
    queryFn: ({ signal }) => api.fetchDmRecipients(q, signal),
    enabled: visible,
    placeholderData: (prev) => prev,
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalRoot}>
        <View style={styles.modalHead}>
          <Text style={styles.sheetTitle}>New message</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </Pressable>
        </View>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.search}
            placeholder="Search players by name"
            placeholderTextColor={colors.textMuted}
            value={q}
            onChangeText={setQ}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        <FlatList
          data={recipients.data?.players ?? []}
          keyExtractor={(p) => String(p.id)}
          style={styles.recipientList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable style={styles.recipientRow} onPress={() => onPick(item.id)}>
              <Text style={styles.recipientName}>{item.name}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          )}
          ListEmptyComponent={
            recipients.isLoading ? (
              <Text style={styles.empty}>Loading…</Text>
            ) : (
              <Text style={styles.empty}>No players match “{q.trim()}”.</Text>
            )
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  empty: { color: colors.textMuted, textAlign: "center", padding: spacing.xl },
  list: { padding: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  rowMain: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: font.base, fontWeight: "700" },
  preview: { color: colors.textMuted, fontSize: font.sm },
  rowRight: { alignItems: "flex-end", gap: 4 },
  when: { color: colors.textMuted, fontSize: font.xs },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },

  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingLeft: 6,
    paddingRight: 10,
  },
  newBtnText: { color: colors.goldText, fontSize: font.sm, fontWeight: "800" },

  modalRoot: { flex: 1, backgroundColor: colors.bg },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: { color: colors.text, fontSize: font.md, fontWeight: "800" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    margin: spacing.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.cardRaised,
  },
  search: { flex: 1, color: colors.text, paddingVertical: spacing.md, fontSize: 15 },
  recipientList: { flex: 1 },
  recipientRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recipientName: { color: colors.text, fontSize: font.base },
});

import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";

import { ApiError } from "@/src/api/client";
import type { LeagueNotice } from "@/src/api/types";
import { Button, Card, ErrorState, Loading } from "@/src/components/ui";
import { useManageNotices, useNoticeMutations } from "@/src/hooks/queries";
import { colors, font, radius, spacing } from "@/src/theme";

export default function NoticesScreen() {
  const query = useManageNotices();
  const mut = useNoticeMutations();
  const [draft, setDraft] = useState("");

  function add() {
    const m = draft.trim();
    if (!m) return;
    mut.create.mutate(m, {
      onSuccess: () => setDraft(""),
      onError: (e) => Alert.alert("Couldn't post", errText(e)),
    });
  }

  return (
    <>
      <Stack.Screen options={{ title: "League notices" }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {query.isLoading ? (
          <Loading label="Loading…" />
        ) : query.isError ? (
          <ErrorState
            message={query.error instanceof ApiError ? query.error.detail : "Couldn't load notices."}
            onRetry={() => query.refetch()}
          />
        ) : (
          <>
            <Card>
              <Text style={styles.heading}>Post a notice</Text>
              <Text style={styles.hint}>
                Active notices show on everyone&apos;s Home screen.
              </Text>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder="e.g. Rink closed this Sunday"
                placeholderTextColor={colors.textMuted}
                multiline
              />
              <Button
                label="Post notice"
                onPress={add}
                loading={mut.create.isPending}
                disabled={!draft.trim()}
              />
            </Card>

            {(query.data ?? []).length === 0 ? (
              <Text style={styles.muted}>No notices yet.</Text>
            ) : (
              (query.data ?? []).map((n) => (
                <NoticeRow key={n.id} notice={n} mut={mut} />
              ))
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

function NoticeRow({
  notice,
  mut,
}: {
  notice: LeagueNotice;
  mut: ReturnType<typeof useNoticeMutations>;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(notice.message);

  function save() {
    const m = text.trim();
    if (!m || m === notice.message) {
      setEditing(false);
      return;
    }
    mut.update.mutate(
      { id: notice.id, body: { message: m } },
      {
        onSuccess: () => setEditing(false),
        onError: (e) => Alert.alert("Couldn't save", errText(e)),
      },
    );
  }

  function confirmDelete() {
    Alert.alert("Delete notice?", notice.message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => mut.remove.mutate(notice.id) },
    ]);
  }

  return (
    <Card style={!notice.is_active ? styles.inactive : undefined}>
      {editing ? (
        <>
          <TextInput style={styles.input} value={text} onChangeText={setText} multiline />
          <View style={styles.row}>
            <Button label="Save" onPress={save} loading={mut.update.isPending} style={styles.grow} />
            <Button
              label="Cancel"
              variant="secondary"
              onPress={() => {
                setText(notice.message);
                setEditing(false);
              }}
              style={styles.grow}
            />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.noticeText}>{notice.message}</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{notice.is_active ? "Active" : "Hidden"}</Text>
            <Switch
              value={notice.is_active}
              onValueChange={(v) =>
                mut.update.mutate({ id: notice.id, body: { is_active: v } })
              }
              trackColor={{ true: colors.gold, false: colors.border }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.row}>
            <Pressable onPress={() => setEditing(true)} hitSlop={6}>
              <Text style={styles.link}>Edit</Text>
            </Pressable>
            <Pressable onPress={confirmDelete} hitSlop={6}>
              <Text style={styles.linkDanger}>Delete</Text>
            </Pressable>
          </View>
        </>
      )}
    </Card>
  );
}

function errText(e: unknown): string {
  return e instanceof ApiError ? e.detail : "Something went wrong.";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  heading: { color: colors.gold, fontSize: font.md, fontWeight: "800" },
  hint: { color: colors.textMuted, fontSize: font.sm },
  muted: { color: colors.textMuted, textAlign: "center", marginTop: spacing.md },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 15,
    minHeight: 48,
    textAlignVertical: "top",
  },
  inactive: { opacity: 0.6 },
  noticeText: { color: colors.text, fontSize: font.base, lineHeight: 21 },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  toggleLabel: {
    color: colors.textMuted,
    fontSize: font.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  row: { flexDirection: "row", gap: spacing.lg, alignItems: "center" },
  grow: { flex: 1 },
  link: { color: colors.gold, fontWeight: "700", fontSize: font.sm },
  linkDanger: { color: colors.red, fontWeight: "700", fontSize: font.sm },
});

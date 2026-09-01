import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ApiError } from "@/src/api/client";
import type { TeamHistoryEntry } from "@/src/api/types";
import { Card, ErrorState, Loading } from "@/src/components/ui";
import { formatDateTime } from "@/src/format";
import { useDeleteTeamHistory, useTeamHistory } from "@/src/hooks/queries";
import { colors, font, radius, spacing } from "@/src/theme";

export default function TeamHistoryScreen() {
  const { event } = useLocalSearchParams<{ event: string }>();
  const eventId = Number(event);
  const query = useTeamHistory(eventId);
  const del = useDeleteTeamHistory(eventId);
  const [open, setOpen] = useState<number | null>(null);

  function confirmDelete(id: number) {
    Alert.alert("Delete this split?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => del.mutate(id) },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ title: "Saved splits" }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {query.isLoading ? (
          <Loading label="Loading…" />
        ) : query.isError ? (
          <ErrorState
            message={query.error instanceof ApiError ? query.error.detail : "Couldn't load."}
            onRetry={() => query.refetch()}
          />
        ) : (query.data ?? []).length === 0 ? (
          <Text style={styles.empty}>No saved splits for this event yet.</Text>
        ) : (
          (query.data ?? []).map((h) => (
            <Card key={h.id}>
              <Pressable
                style={styles.head}
                onPress={() => setOpen((o) => (o === h.id ? null : h.id))}
              >
                <View style={styles.headMain}>
                  <Text style={styles.when}>{formatDateTime(h.created_at)}</Text>
                  <Text style={styles.meta}>
                    {h.created_by} · {h.gold_players.length}v{h.black_players.length}
                    {h.balanced ? "" : " · uneven"}
                    {h.note ? ` · “${h.note}”` : ""}
                  </Text>
                </View>
                <Ionicons
                  name={open === h.id ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>

              {open === h.id ? (
                <View style={styles.body}>
                  <View style={styles.cols}>
                    <Side title="Gold" goalie={h.gold_goalie?.name} players={h.gold_players} gold />
                    <Side title="Black" goalie={h.black_goalie?.name} players={h.black_players} />
                  </View>
                  <Pressable style={styles.delete} onPress={() => confirmDelete(h.id)}>
                    <Ionicons name="trash-outline" size={15} color={colors.red} />
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                </View>
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>
    </>
  );
}

function Side({
  title,
  goalie,
  players,
  gold,
}: {
  title: string;
  goalie?: string;
  players: TeamHistoryEntry["gold_players"];
  gold?: boolean;
}) {
  return (
    <View style={styles.side}>
      <Text style={[styles.sideTitle, gold && { color: colors.gold }]}>{title}</Text>
      {goalie ? <Text style={styles.sideGoalie}>🥅 {goalie}</Text> : null}
      {players.map((p, i) => (
        <Text key={i} style={styles.sidePlayer} numberOfLines={1}>
          {p.name}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  empty: { color: colors.textMuted, textAlign: "center", padding: spacing.xl },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headMain: { flex: 1, gap: 2 },
  when: { color: colors.text, fontSize: font.sm, fontWeight: "700" },
  meta: { color: colors.textMuted, fontSize: font.xs },
  body: { gap: spacing.sm, marginTop: spacing.sm },
  cols: { flexDirection: "row", gap: spacing.md },
  side: { flex: 1, gap: 2 },
  sideTitle: { color: colors.text, fontSize: font.xs, fontWeight: "800", textTransform: "uppercase" },
  sideGoalie: { color: colors.gold, fontSize: font.xs, fontWeight: "700" },
  sidePlayer: { color: colors.text, fontSize: font.xs },
  delete: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start" },
  deleteText: { color: colors.red, fontSize: font.xs, fontWeight: "700" },
});

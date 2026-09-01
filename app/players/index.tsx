import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ApiError } from "@/src/api/client";
import type { PlayerRow } from "@/src/api/types";
import { Badge, ErrorState, Loading } from "@/src/components/ui";
import { usePlayers } from "@/src/hooks/queries";
import { colors, font, radius, spacing } from "@/src/theme";

export default function PlayersScreen() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [night, setNight] = useState<number | null>(null);
  const [goaliesOnly, setGoaliesOnly] = useState(false);

  const query = usePlayers({ night, goalies: goaliesOnly, q });
  const nights = query.data?.nights ?? [];
  const players = query.data?.players ?? [];

  const sorted = useMemo(
    () => [...players].sort((a, b) => b.ratings.ppv - a.ratings.ppv),
    [players],
  );

  return (
    <>
      <Stack.Screen options={{ title: "Player profiles" }} />
      <View style={styles.screen}>
        <View style={styles.controls}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.search}
              placeholder="Search players"
              placeholderTextColor={colors.textMuted}
              value={q}
              onChangeText={setQ}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            data={[{ id: null, name: "Global" }, ...nights]}
            keyExtractor={(n) => String(n.id ?? "global")}
            renderItem={({ item }) => {
              const active = night === item.id;
              return (
                <Pressable
                  onPress={() => setNight(item.id)}
                  style={[styles.chip, active && styles.chipOn]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextOn]}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />

          <Pressable
            style={styles.toggleRow}
            onPress={() => setGoaliesOnly((v) => !v)}
            hitSlop={8}
          >
            <Ionicons
              name={goaliesOnly ? "checkbox" : "square-outline"}
              size={18}
              color={goaliesOnly ? colors.gold : colors.textMuted}
            />
            <Text style={styles.toggleText}>Goalies only</Text>
            {night != null ? (
              <Text style={styles.sourceNote}>· showing {nights.find((n) => n.id === night)?.name} ratings</Text>
            ) : null}
          </Pressable>
        </View>

        {query.isLoading ? (
          <Loading label="Loading players…" />
        ) : query.isError ? (
          <ErrorState
            message={
              query.error instanceof ApiError ? query.error.detail : "Couldn't load players."
            }
            onRetry={() => query.refetch()}
          />
        ) : (
          <FlatList
            data={sorted}
            keyExtractor={(p) => String(p.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <PlayerListRow row={item} onPress={() => router.push(`/players/${item.id}` as never)} />
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>No players match.</Text>
            }
          />
        )}
      </View>
    </>
  );
}

function PlayerListRow({ row, onPress }: { row: PlayerRow; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowMain}>
        <Text style={styles.name}>{row.name}</Text>
        {row.is_goalie ? <Badge text="G" tone="goalie" /> : null}
        {row.rating_source === "night" ? <Badge text="NIGHT" tone="gold" /> : null}
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.ppv}>{row.ratings.ppv.toFixed(2)}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  controls: {
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.cardRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  search: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: spacing.sm },
  chipRow: { gap: spacing.xs, paddingVertical: 2 },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardRaised,
  },
  chipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.textMuted, fontSize: font.xs, fontWeight: "700" },
  chipTextOn: { color: colors.goldText },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  toggleText: { color: colors.text, fontSize: font.sm },
  sourceNote: { color: colors.textMuted, fontSize: font.xs },
  list: { padding: spacing.md, gap: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowMain: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 1 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  name: { color: colors.text, fontSize: font.base, fontWeight: "600" },
  ppv: {
    color: colors.gold,
    fontSize: font.base,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  empty: { color: colors.textMuted, textAlign: "center", padding: spacing.xl },
});

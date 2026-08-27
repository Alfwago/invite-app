import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";

import { ApiError } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { EventCard } from "@/src/components/EventCard";
import { EmptyState, ErrorState, Loading } from "@/src/components/ui";
import { useEvents } from "@/src/hooks/queries";
import { colors, radius, spacing } from "@/src/theme";

export default function EventsScreen() {
  const { me } = useAuth();
  const [past, setPast] = useState(false);
  const query = useEvents(past);

  if (query.isLoading) return <Loading label="Loading events…" />;
  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.detail : "Couldn't load events."}
        onRetry={() => query.refetch()}
      />
    );
  }

  const events = query.data ?? [];

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={events}
      keyExtractor={(e) => String(e.id)}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={query.refetch}
          tintColor={colors.gold}
        />
      }
      ListHeaderComponent={
        <View style={styles.toggleRow}>
          <ToggleChip label="Upcoming" active={!past} onPress={() => setPast(false)} />
          <ToggleChip label="Recent" active={past} onPress={() => setPast(true)} />
          {me?.is_director ? (
            <Link href="/new-event" asChild>
              <Pressable style={styles.newBtn}>
                <Text style={styles.newBtnText}>+ New event</Text>
              </Pressable>
            </Link>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <EmptyState message={past ? "Nothing in the last month." : "No upcoming events."} />
      }
      renderItem={({ item }) => <EventCard event={item} />}
    />
  );
}

function ToggleChip({
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
  list: { flex: 1, backgroundColor: colors.bg },
  listContent: { padding: spacing.lg, gap: spacing.md },
  toggleRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center", marginBottom: spacing.xs },
  chip: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  chipText: { color: colors.text, fontWeight: "600" },
  newBtn: { marginLeft: "auto", paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  newBtnText: { color: colors.gold, fontWeight: "700" },
});

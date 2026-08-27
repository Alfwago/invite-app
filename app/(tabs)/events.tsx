import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";

import type { EventSummary } from "@/src/api/types";
import { useAuth } from "@/src/auth/AuthContext";
import { Badge, EmptyState, ErrorState, Loading } from "@/src/components/ui";
import { ApiError } from "@/src/api/client";
import { formatEventDate, formatTime, rosterLabel } from "@/src/format";
import { useEvents } from "@/src/hooks/queries";
import { colors, radius, rsvpColor, spacing } from "@/src/theme";

export default function EventsScreen() {
  const { me } = useAuth();
  const [past, setPast] = useState(false);
  const query = useEvents(past);

  if (query.isLoading) return <Loading label="Loading events…" />;
  if (query.isError) {
    const err = query.error;
    return (
      <ErrorState
        message={err instanceof ApiError ? err.detail : "Couldn't load events."}
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
      renderItem={({ item }) => <EventRow event={item} />}
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

function EventRow({ event }: { event: EventSummary }) {
  const status = event.my_rsvp?.status ?? "NO_RESPONSE";
  return (
    <Link href={`/event/${event.id}`} asChild>
      <Pressable style={styles.row}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>{event.display_name}</Text>
          {event.can_manage ? <Badge text="MANAGE" color={colors.border} /> : null}
        </View>
        <Text style={styles.rowMeta}>
          {formatEventDate(event.date)}
          {event.start_time ? ` · ${formatTime(event.start_time)}` : ""}
          {event.location ? ` · ${event.location}` : ""}
        </Text>
        <View style={styles.rowBottom}>
          <Text style={styles.rowRoster}>
            {rosterLabel(event.roster.skaters, event.roster.capacity)}
            {event.roster.goalies_needed != null
              ? ` · ${event.roster.goalies} / ${event.roster.goalies_needed} G`
              : ""}
          </Text>
          <Badge text={status.replace("_", " ")} color={rsvpColor[status] ?? colors.textMuted} />
        </View>
      </Pressable>
    </Link>
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
  row: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowTitle: { color: colors.text, fontSize: 17, fontWeight: "700", flexShrink: 1 },
  rowMeta: { color: colors.textMuted, fontSize: 13 },
  rowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  rowRoster: { color: colors.text, fontSize: 14, flexShrink: 1 },
});

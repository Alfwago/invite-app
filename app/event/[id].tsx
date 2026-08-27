import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";

import { ApiError } from "@/src/api/client";
import type { RosterEntry } from "@/src/api/types";
import { DirectorPanel } from "@/src/components/DirectorPanel";
import { RsvpControls } from "@/src/components/RsvpControls";
import { Badge, Card, ErrorState, Loading } from "@/src/components/ui";
import { formatEventDate, formatTime, rosterLabel } from "@/src/format";
import { useEvent } from "@/src/hooks/queries";
import { colors, rsvpColor, spacing } from "@/src/theme";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useEvent(id);

  if (query.isLoading) return <Loading label="Loading event…" />;
  if (query.isError || !query.data) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.detail : "Couldn't load this event."}
        onRetry={() => query.refetch()}
      />
    );
  }

  const event = query.data;
  const roster = event.roster;
  const going = event.players.filter((p) => p.status === "YES");
  const waitlisted = event.players.filter((p) => p.status === "WAITLIST");

  return (
    <>
      <Stack.Screen options={{ title: event.display_name }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={query.refetch}
            tintColor={colors.gold}
          />
        }
      >
        <Card>
          <Text style={styles.title}>{event.display_name}</Text>
          <Text style={styles.meta}>
            {formatEventDate(event.date)}
            {event.start_time ? ` · ${formatTime(event.start_time)}` : ""}
          </Text>
          {event.location ? <Text style={styles.meta}>{event.location}</Text> : null}
          <View style={styles.statusRow}>
            <Badge text={event.status} color={colors.border} />
            {roster.rsvp_locked ? <Badge text="RSVP LOCKED" color={colors.red} /> : null}
          </View>
          {event.director_message ? (
            <Text style={styles.dirMessage}>{event.director_message}</Text>
          ) : null}
        </Card>

        <Card>
          <Text style={styles.heading}>Roster</Text>
          <Text style={styles.rosterBig}>
            {rosterLabel(roster.skaters, roster.capacity)}
          </Text>
          <Text style={styles.rosterLine}>
            Goalies: {roster.goalies}
            {roster.goalies_needed != null ? ` / ${roster.goalies_needed}` : ""} · Waitlist:{" "}
            {roster.waitlist} · Maybe: {roster.maybe}
          </Text>
          {roster.is_full ? <Badge text="ROSTER FULL" color={colors.amber} /> : null}
        </Card>

        {event.status === "OPEN" ? (
          <RsvpControls event={event} />
        ) : (
          <Card>
            <Text style={styles.muted}>RSVPs aren't open for this event yet.</Text>
          </Card>
        )}

        {event.can_manage ? <DirectorPanel event={event} /> : null}

        <Card>
          <Text style={styles.heading}>Going ({going.length})</Text>
          {going.length === 0 ? (
            <Text style={styles.muted}>Nobody yet.</Text>
          ) : (
            going.map((p) => <PlayerLine key={p.player_id} entry={p} />)
          )}
          {event.day_players.map((dp) => (
            <Text key={`dp-${dp.id}`} style={styles.playerName}>
              {dp.name} {dp.is_goalie ? "🥅" : ""} · walk-on
            </Text>
          ))}
        </Card>

        {waitlisted.length > 0 ? (
          <Card>
            <Text style={styles.heading}>Waitlist ({waitlisted.length})</Text>
            {waitlisted.map((p) => (
              <PlayerLine key={p.player_id} entry={p} />
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </>
  );
}

function PlayerLine({ entry }: { entry: RosterEntry }) {
  return (
    <View style={styles.playerRow}>
      <Text style={styles.playerName}>
        {entry.name}
        {entry.is_goalie ? " 🥅" : ""}
        {entry.guest_count > 0 ? ` +${entry.guest_count}` : ""}
      </Text>
      <View style={styles.playerTags}>
        {entry.is_beer_guy ? <Badge text="🍺" color={colors.border} /> : null}
        {entry.is_whiskey_guy ? <Badge text="🥃" color={colors.border} /> : null}
        {entry.present ? <Badge text="IN" color={rsvpColor.YES} /> : null}
        {entry.paid ? <Badge text="PAID" color={colors.green} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
  meta: { color: colors.textMuted, fontSize: 14 },
  statusRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  dirMessage: {
    color: colors.text,
    fontSize: 15,
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
  heading: { color: colors.text, fontSize: 16, fontWeight: "700" },
  rosterBig: { color: colors.gold, fontSize: 22, fontWeight: "800" },
  rosterLine: { color: colors.textMuted, fontSize: 13 },
  muted: { color: colors.textMuted },
  playerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  playerName: { color: colors.text, fontSize: 15, flexShrink: 1 },
  playerTags: { flexDirection: "row", gap: spacing.xs },
});

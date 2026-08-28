import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ApiError } from "@/src/api/client";
import type { RosterEntry } from "@/src/api/types";
import { DirectorPanel } from "@/src/components/DirectorPanel";
import { RsvpControls } from "@/src/components/RsvpControls";
import { Badge, Card, ErrorState, FillBar, Loading } from "@/src/components/ui";
import { formatEventDate, formatTime } from "@/src/format";
import { fillPct, rosterHealth } from "@/src/roster";
import { useEvent } from "@/src/hooks/queries";
import { colors, font, radius, spacing } from "@/src/theme";

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

  const pct = fillPct(roster);
  const health = rosterHealth(roster);
  const goalieTone = (roster.goalie_spots_open ?? 0) > 0 ? "bad" : "good";
  const skaterTone = roster.is_full
    ? "good"
    : (roster.skater_spots_open ?? 0) > 0
      ? "caution"
      : "good";

  const spotsText = roster.is_full
    ? "Roster full"
    : roster.skater_spots_open != null
      ? `${roster.skater_spots_open} spot${roster.skater_spots_open === 1 ? "" : "s"} left`
      : `${roster.skaters} in`;

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
            <Badge text={event.status} tone="neutral" />
            {roster.rsvp_locked ? <Badge text="RSVP LOCKED" tone="bad" /> : null}
          </View>
        </Card>

        {event.director_message ? (
          <Card accent="public">
            <Text style={styles.dirLabel}>From the director</Text>
            <Text style={styles.dirMessage}>{event.director_message}</Text>
          </Card>
        ) : null}

        <Card>
          <Text style={styles.heading}>Roster</Text>
          <View style={styles.tiles}>
            <StatTile
              value={`${roster.skaters}`}
              sub={roster.capacity != null ? `/ ${roster.capacity}` : undefined}
              label="Skaters"
              tone={skaterTone}
            />
            <StatTile
              value={`${roster.goalies}`}
              sub={roster.goalies_needed != null ? `/ ${roster.goalies_needed}` : undefined}
              label="Goalies"
              tone={goalieTone}
            />
            <StatTile value={`${roster.waitlist}`} label="Waitlist" />
          </View>
          {pct != null ? <FillBar pct={pct} tone={health} /> : null}
          <Text style={styles.rosterLine}>
            {spotsText} · {roster.maybe} maybe
          </Text>
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
            <View key={`dp-${dp.id}`} style={styles.playerRow}>
              <View style={styles.playerNameWrap}>
                <Text style={styles.playerName}>{dp.name}</Text>
                {dp.is_goalie ? <Badge text="G" tone="goalie" /> : null}
                <Text style={styles.walkOn}>walk-on</Text>
              </View>
            </View>
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

function StatTile({
  value,
  sub,
  label,
  tone,
}: {
  value: string;
  sub?: string;
  label: string;
  tone?: "good" | "caution" | "bad";
}) {
  const c =
    tone === "good"
      ? colors.green
      : tone === "bad"
        ? colors.red
        : tone === "caution"
          ? colors.amber
          : colors.text;
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>
        <Text style={{ color: c }}>{value}</Text>
        {sub ? <Text style={styles.tileSub}> {sub}</Text> : null}
      </Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function PlayerLine({ entry }: { entry: RosterEntry }) {
  return (
    <View style={styles.playerRow}>
      <View style={styles.playerNameWrap}>
        <Text style={styles.playerName}>
          {entry.name}
          {entry.guest_count > 0 ? ` +${entry.guest_count}` : ""}
        </Text>
        {entry.is_goalie ? <Badge text="G" tone="goalie" /> : null}
      </View>
      <View style={styles.playerTags}>
        {entry.is_beer_guy ? (
          <Ionicons name="beer-outline" size={16} color={colors.green} />
        ) : null}
        {entry.is_whiskey_guy ? (
          <Ionicons name="wine-outline" size={16} color={colors.amber} />
        ) : null}
        {entry.present ? <Badge text="IN" tone="good" /> : null}
        {entry.paid ? <Badge text="PAID" tone="good" /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  title: { color: colors.text, fontSize: font.lg, fontWeight: "800" },
  meta: { color: colors.textMuted, fontSize: font.sm },
  statusRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs, flexWrap: "wrap" },
  dirLabel: {
    color: colors.gold,
    fontSize: font.xs,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  dirMessage: { color: colors.text, fontSize: font.base, fontStyle: "italic" },
  heading: { color: colors.text, fontSize: font.md, fontWeight: "700" },
  tiles: { flexDirection: "row", gap: spacing.sm },
  tile: {
    flex: 1,
    backgroundColor: colors.cardRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
  },
  tileValue: { fontSize: font.lg, fontWeight: "800", color: colors.text },
  tileSub: { fontSize: font.sm, fontWeight: "600", color: colors.textMuted },
  tileLabel: {
    marginTop: spacing.xs,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  rosterLine: { color: colors.textMuted, fontSize: font.sm },
  muted: { color: colors.textMuted },
  playerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    gap: spacing.sm,
  },
  playerNameWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 1,
  },
  playerName: { color: colors.text, fontSize: font.sm, flexShrink: 1 },
  walkOn: { color: colors.textMuted, fontSize: font.xs },
  playerTags: { flexDirection: "row", gap: spacing.sm, alignItems: "center", flexShrink: 0 },
});

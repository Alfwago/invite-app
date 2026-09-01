import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ApiError } from "@/src/api/client";
import type { DayPlayer, EventDetail, RosterEntry, RsvpStatus } from "@/src/api/types";
import { KeyboardAwareScrollView } from "@/src/components/KeyboardAwareScrollView";
import { RsvpControls } from "@/src/components/RsvpControls";
import { TeamAssignmentCard } from "@/src/components/TeamAssignmentCard";
import {
  Badge,
  Button,
  Card,
  CollapsibleCard,
  ErrorState,
  FillBar,
  Loading,
} from "@/src/components/ui";
import { formatEventDate, formatTime } from "@/src/format";
import { fillPct, rosterHealth } from "@/src/roster";
import { useEvent } from "@/src/hooks/queries";
import { colors, font, radius, spacing } from "@/src/theme";

const TABS: { key: RsvpStatus; label: string }[] = [
  { key: "YES", label: "Yes" },
  { key: "WAITLIST", label: "Waitlist" },
  { key: "MAYBE", label: "Maybe" },
  { key: "NO", label: "No" },
  { key: "NO_RESPONSE", label: "No reply" },
];

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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

  const goingCount =
    event.players.filter((p) => p.status === "YES").length + event.day_players.length;

  return (
    <>
      <Stack.Screen options={{ title: event.display_name }} />
      <KeyboardAwareScrollView
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

        {event.team_assignment ? (
          <View style={styles.teamSection}>
            <Text style={styles.sectionLabel}>Your team</Text>
            <TeamAssignmentCard assignment={event.team_assignment} />
          </View>
        ) : null}

        <CollapsibleCard
          title="Roster"
          defaultOpen
          right={<Text style={styles.headerCount}>{goingCount} going</Text>}
        >
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
          <RosterTabs event={event} />
        </CollapsibleCard>

        {event.status === "OPEN" ? (
          <CollapsibleCard title="Your RSVP" defaultOpen>
            <RsvpControls event={event} />
          </CollapsibleCard>
        ) : (
          <Card>
            <Text style={styles.muted}>RSVPs aren't open for this event yet.</Text>
          </Card>
        )}

        <Pressable
          style={styles.threadBtn}
          onPress={() => router.push(`/event/${event.id}/messages`)}
        >
          <Ionicons name="chatbubbles-outline" size={20} color={colors.text} />
          <Text style={styles.threadBtnText}>Messages</Text>
          {event.messages_unread > 0 ? (
            <View style={styles.threadBadge}>
              <Text style={styles.threadBadgeText}>{event.messages_unread}</Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        {event.can_manage ? (
          <Button
            label="Manage event"
            variant="secondary"
            onPress={() => router.push(`/event/${event.id}/manage`)}
          />
        ) : null}
      </KeyboardAwareScrollView>
    </>
  );
}

function RosterTabs({ event }: { event: EventDetail }) {
  const [tab, setTab] = useState<RsvpStatus>("YES");

  const byStatus = useMemo(() => {
    const m = new Map<RsvpStatus, RosterEntry[]>();
    for (const t of TABS) m.set(t.key, []);
    for (const p of event.players) {
      const list = m.get(p.status);
      if (list) list.push(p);
    }
    return m;
  }, [event.players]);

  const rows = byStatus.get(tab) ?? [];
  const showDayPlayers = tab === "YES" && event.day_players.length > 0;

  return (
    <View style={styles.tabsWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBar}
      >
        {TABS.map((t) => {
          const count = (byStatus.get(t.key) ?? []).length + (t.key === "YES" ? event.day_players.length : 0);
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t.label} {count}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.tabBody}>
        {rows.length === 0 && !showDayPlayers ? (
          <Text style={styles.muted}>Nobody here.</Text>
        ) : (
          <>
            {rows.map((p) => (
              <PlayerLine key={p.player_id} entry={p} />
            ))}
            {showDayPlayers
              ? event.day_players.map((dp) => <DayPlayerLine key={`dp-${dp.id}`} dp={dp} />)
              : null}
          </>
        )}
      </View>
    </View>
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

function DayPlayerLine({ dp }: { dp: DayPlayer }) {
  return (
    <View style={styles.playerRow}>
      <View style={styles.playerNameWrap}>
        <Text style={styles.playerName}>{dp.name}</Text>
        {dp.is_goalie ? <Badge text="G" tone="goalie" /> : null}
        <Text style={styles.walkOn}>walk-on</Text>
      </View>
    </View>
  );
}

function PlayerLine({ entry }: { entry: RosterEntry }) {
  return (
    <View>
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
      {entry.guest_names.length > 0 ? (
        <Text style={styles.guestLine}>with {entry.guest_names.join(", ")}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  title: { color: colors.text, fontSize: font.lg, fontWeight: "800" },
  meta: { color: colors.textMuted, fontSize: font.sm },
  statusRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs, flexWrap: "wrap" },
  headerCount: { color: colors.textMuted, fontSize: font.sm, fontWeight: "600" },
  dirLabel: {
    color: colors.gold,
    fontSize: font.xs,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  dirMessage: { color: colors.text, fontSize: font.base, fontStyle: "italic" },
  teamSection: { gap: spacing.sm },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: font.xs,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
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
  tabsWrap: { gap: spacing.sm },
  tabBar: { gap: spacing.xs, paddingVertical: spacing.xs },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardRaised,
  },
  tabActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  tabText: { color: colors.textMuted, fontSize: font.xs, fontWeight: "700" },
  tabTextActive: { color: colors.goldText },
  tabBody: { gap: 2 },
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
  guestLine: { color: colors.textMuted, fontSize: font.xs, marginLeft: spacing.md, marginBottom: 4 },
  threadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  threadBtnText: { color: colors.text, fontSize: font.base, fontWeight: "700", flex: 1 },
  threadBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  threadBadgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  playerTags: { flexDirection: "row", gap: spacing.sm, alignItems: "center", flexShrink: 0 },
});

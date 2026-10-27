import { useMemo, useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ApiError } from "@/src/api/client";
import type { DayPlayer, EventDetail, RosterEntry, RsvpStatus } from "@/src/api/types";
import { KeyboardAwareScrollView } from "@/src/components/KeyboardAwareScrollView";
import { LateScratchesCard } from "@/src/components/LateScratchesCard";
import { PenaltyBoxCard } from "@/src/components/PenaltyBoxCard";
import { PromotionCard } from "@/src/components/PromotionCard";
import { RsvpControls } from "@/src/components/RsvpControls";
import { Tap } from "@/src/components/Tap";
import { TEAM_TINT, TeamAssignmentCard } from "@/src/components/TeamAssignmentCard";
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
import { fillPct, isSkating, rosterHealth, spotsOpen } from "@/src/roster";
import { roleTag } from "@/src/roleTag";
import { useEvent } from "@/src/hooks/queries";
import { goingSections } from "@/src/rosterGroups";
import { colors, font, radius, spacing } from "@/src/theme";
import { usePullToRefresh } from "@/src/hooks/usePullToRefresh";

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
  const pull = usePullToRefresh(query.refetch);

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
  // A non-skating event (party, golf outing — server 0.40.0+): "Who's Going",
  // no goalies, never short of skaters (owner 2026-10-27).
  const skating = isSkating(roster) && event.is_skating !== false;
  const open = spotsOpen(roster);
  const goalieTone = (roster.goalie_spots_open ?? 0) > 0 ? "bad" : "good";
  const skaterTone = roster.is_full || !skating ? "good" : (open ?? 0) > 0 ? "caution" : "good";

  const spotsText = roster.is_full
    ? skating
      ? "Roster full"
      : "Full"
    : open != null
      ? `${open} spot${open === 1 ? "" : "s"} left`
      : `${roster.skaters} ${skating ? "in" : "going"}`;

  const goingCount =
    event.players.filter((p) => p.status === "YES").length + event.day_players.length;
  // Promoted off the waitlist and not answered (server 0.36.0+): the card
  // goes right under the header and the RSVP buttons are hidden until they
  // answer — two clear choices, nothing else to edit (owner 2026-10-15).
  const promotion = !event.is_past ? event.my_rsvp?.promotion ?? null : null;

  return (
    <>
      <Stack.Screen options={{ title: event.display_name }} />
      <KeyboardAwareScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={pull.refreshing}
            onRefresh={pull.onRefresh}
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
          <VenueDetails event={event} skating={skating} />
          <View style={styles.statusRow}>
            <Badge text={event.status} tone="neutral" />
            {roster.rsvp_locked ? <Badge text="RSVP LOCKED" tone="bad" /> : null}
          </View>
        </Card>

        {promotion ? <PromotionCard eventId={event.id} promotion={promotion} /> : null}

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

        {/* Late Scratches + Penalty Box sit right above the roster, as on the
            website (owner LD11, 2026-10-16). */}
        <LateScratchesCard event={event} />
        <PenaltyBoxCard event={event} />

        <CollapsibleCard
          title={skating ? "Roster" : "Who's Going"}
          defaultOpen
          right={
            <Text style={styles.headerCount}>
              {/* A party's headline count includes guests; say how it splits. */}
              {skating || roster.guest_yes === 0
                ? `${goingCount} going`
                : `${goingCount} + ${roster.guest_yes} guest${roster.guest_yes === 1 ? "" : "s"}`}
            </Text>
          }
          summary={
            <View style={styles.tiles}>
              <StatTile
                value={`${roster.skaters}`}
                sub={roster.capacity != null ? `/ ${roster.capacity}` : undefined}
                label={skating ? "Skaters" : "Going"}
                tone={skaterTone}
              />
              {skating ? (
                <StatTile
                  value={`${roster.goalies}`}
                  sub={roster.goalies_needed != null ? `/ ${roster.goalies_needed}` : undefined}
                  label="Goalies"
                  tone={goalieTone}
                />
              ) : (
                <StatTile value={`${roster.guest_yes}`} label="Guests" />
              )}
              <StatTile value={`${roster.waitlist}`} label="Waitlist" />
            </View>
          }
        >
          {pct != null ? <FillBar pct={pct} tone={health} /> : null}
          <Text style={styles.rosterLine}>
            {spotsText} · {roster.maybe} maybe
          </Text>
          <RosterTabs event={event} skating={skating} />
        </CollapsibleCard>

        {event.is_past ? (
          <Card>
            <Text style={styles.muted}>This {skating ? "skate" : "event"} is over.</Text>
          </Card>
        ) : promotion ? null : event.status === "OPEN" ? (
          <CollapsibleCard title="Your RSVP" defaultOpen>
            {event.my_borrow ? (
              <Text style={styles.borrowNote}>
                You&apos;re filling in for {event.my_borrow.night_name}, this skate only.
                {event.my_borrow.added_by_name ? ` Added by ${event.my_borrow.added_by_name}.` : ""}
              </Text>
            ) : null}
            <RsvpControls event={event} />
          </CollapsibleCard>
        ) : (
          <Card>
            <Text style={styles.muted}>RSVPs aren&apos;t open for this event yet.</Text>
          </Card>
        )}

        <Tap
          style={styles.threadBtn}
          onPress={() => router.push(`/event/${event.id}/messages`)}
        >
          <Ionicons name="chatbubbles-outline" size={20} color={colors.text} />
          <View style={{ flex: 1 }}>
            <Text style={styles.threadBtnText}>Messages</Text>
            <Text style={styles.threadBtnSub}>
              Everyone invited to this {skating ? "skate" : "event"} can see these
            </Text>
          </View>
          {event.messages_unread > 0 ? (
            <View style={styles.threadBadge}>
              <Text style={styles.threadBadgeText}>{event.messages_unread}</Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Tap>

        {event.can_manage ? (
          <Button
            label="Manage event"
            variant="secondary"
            labelColor={colors.gold}
            onPress={() => router.push(`/event/${event.id}/manage`)}
          />
        ) : null}

        {event.night && event.night_directors.length > 0 ? (
          <Card>
            <Text style={styles.contactLabel}>Contact the directors</Text>
            <Text style={styles.muted}>
              A question just for whoever runs {event.night.name}? This goes privately to{" "}
              {event.night_directors.map((d) => d.name).join(" and ")} — not the skate thread.
            </Text>
            <Tap
              style={styles.contactBtn}
              onPress={() => router.push(`/inbox/directors/${event.night!.id}` as never)}
            >
              <Ionicons name="mail" size={36} color={colors.goldText} />
              <Text style={styles.contactBtnText}>Contact Directors</Text>
            </Tap>
          </Card>
        ) : null}
      </KeyboardAwareScrollView>
    </>
  );
}

function RosterTabs({ event, skating }: { event: EventDetail; skating: boolean }) {
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
            <Tap
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t.label} {count}
              </Text>
            </Tap>
          );
        })}
      </ScrollView>

      <View style={styles.tabBody}>
        {rows.length === 0 && !showDayPlayers ? (
          <Text style={styles.muted}>Nobody here.</Text>
        ) : tab === "YES" ? (
          // 0.38.0: team sections once teams are published; reserved spots last.
          goingSections(rows, event.day_players).map((section, i) => (
            <View key={section.title ?? `s${i}`} style={styles.rosterSection}>
              {section.title ? <Text style={styles.rosterSectionTitle}>{section.title}</Text> : null}
              {section.players.map((p) => (
                <PlayerLine key={p.player_id} entry={p} skating={skating} />
              ))}
              {section.dayPlayers.map((dp) => (
                <DayPlayerLine key={`dp-${dp.id}`} dp={dp} />
              ))}
            </View>
          ))
        ) : (
          rows.map((p) => <PlayerLine key={p.player_id} entry={p} skating={skating} />)
        )}
      </View>
    </View>
  );
}

/** Arrive-by, cost, venue notes and a Directions button (server 0.40.0+):
 *  a party, or a skate away from the home rink. */
function VenueDetails({ event, skating }: { event: EventDetail; skating: boolean }) {
  const directions = event.directions_url ?? "";
  if (!event.arrive_by && !event.cost_per_person && !event.venue_notes && !directions) return null;
  return (
    <View style={styles.venue}>
      {event.arrive_by ? (
        <Text style={styles.venueStrong}>Arrive by {formatTime(event.arrive_by)}</Text>
      ) : null}
      {event.cost_per_person ? (
        <Text style={styles.venueText}>
          Cost per {skating ? "player" : "person"}: ${event.cost_per_person}
        </Text>
      ) : null}
      {event.venue_notes ? <Text style={styles.venueNotes}>{event.venue_notes}</Text> : null}
      {directions ? (
        <Tap style={styles.directionsBtn} onPress={() => void Linking.openURL(directions)}>
          <Ionicons name="navigate" size={16} color={colors.gold} />
          <Text style={styles.directionsText}>Directions</Text>
        </Tap>
      ) : null}
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

function RoleTag({
  entry,
}: {
  entry: Pick<RosterEntry, "is_goalie" | "is_host" | "is_director" | "is_assistant_director" | "is_acting_director">;
}) {
  // Roster mark reflects the slot the player is actually filling — a
  // Goalie & Skater added as a skater gets no "G", added as a goalie does.
  // A director keeps their ND/AD tag either way (1.8.1).
  const t = roleTag(entry);
  return t ? <Text style={styles.goldTag}>{t}</Text> : null;
}

function DayPlayerLine({ dp }: { dp: DayPlayer }) {
  if (dp.is_reservation) {
    return (
      <View style={styles.playerRow}>
        <View style={styles.playerNameWrap}>
          <Text style={[styles.playerName, styles.reservedName]}>{dp.name}</Text>
          <Text style={styles.walkOn}>{dp.is_goalie ? "goalie spot" : "skater spot"}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.playerRow}>
      <View style={styles.playerNameWrap}>
        <Text style={styles.playerName}>{dp.name}</Text>
        {dp.is_goalie ? <Text style={styles.goldTag}>G</Text> : null}
        <Text style={styles.walkOn}>walk-on</Text>
      </View>
    </View>
  );
}

function PlayerLine({ entry, skating }: { entry: RosterEntry; skating: boolean }) {
  return (
    <View>
      <View style={styles.playerRow}>
        <View style={styles.playerNameWrap}>
          <Text style={styles.playerName}>
            {entry.name}
            {entry.guest_count > 0 ? ` +${entry.guest_count}` : ""}
          </Text>
          <RoleTag entry={entry} />
          {entry.is_borrowed ? (
            <Text
              style={styles.walkOn}
              accessibilityLabel={
                entry.borrowed_from_name ? `Borrowed from ${entry.borrowed_from_name}` : "Borrowed"
              }
            >
              borrowed
            </Text>
          ) : null}
          {entry.team ? (
            <Ionicons
              name="shirt"
              size={15}
              color={TEAM_TINT[entry.team]}
              accessibilityLabel={`${entry.team} Team`}
            />
          ) : null}
          {entry.is_beer_guy ? (
            <Ionicons name="beer" size={15} color={colors.green} />
          ) : null}
          {entry.is_whiskey_guy ? (
            <Ionicons name="wine" size={15} color={colors.amber} />
          ) : null}
        </View>
        <View style={styles.playerTags}>
          {entry.present ? <Badge text="IN" tone="good" /> : null}
          {entry.paid ? <Badge text="PAID" tone="good" /> : null}
        </View>
      </View>
      {/* A party's guests are just a number — the "+N" above says it all. */}
      {skating && entry.guest_names.length > 0 ? (
        <Text style={styles.guestLine}>with {entry.guest_names.join(", ")}</Text>
      ) : null}
      {(entry.family_count ?? 0) > 0 ? (
        <Text style={styles.guestLine}>
          {entry.family_count} family coming to watch
        </Text>
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
  venue: { gap: 4, marginTop: spacing.sm },
  venueStrong: { color: colors.text, fontSize: font.sm, fontWeight: "700" },
  venueText: { color: colors.text, fontSize: font.sm },
  venueNotes: { color: colors.textMuted, fontSize: font.sm },
  directionsBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  directionsText: { color: colors.gold, fontSize: font.sm, fontWeight: "700" },
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
  rosterSection: { gap: 0, marginBottom: spacing.sm },
  rosterSectionTitle: {
    color: colors.gold,
    fontSize: font.xs,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  reservedName: { color: colors.textMuted, fontStyle: "italic" },
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
  goldTag: { color: colors.gold, fontSize: 15, fontWeight: "900" },
  walkOn: { color: colors.textMuted, fontSize: font.xs },
  borrowNote: {
    color: colors.text,
    fontSize: font.sm,
    backgroundColor: colors.cardRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
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
  threadBtnText: { color: colors.text, fontSize: font.base, fontWeight: "700" },
  threadBtnSub: { color: colors.textMuted, fontSize: font.xs, marginTop: 1 },
  contactLabel: { color: colors.text, fontSize: font.md, fontWeight: "700", marginBottom: spacing.xs },
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  contactBtnText: { color: colors.goldText, fontSize: font.base, fontWeight: "700" },
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

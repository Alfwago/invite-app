import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ApiError } from "@/src/api/client";
import type { HomeNight } from "@/src/api/types";
import { Badge, Button, Card, ErrorState, Loading } from "@/src/components/ui";
import { formatEventDate, formatTime } from "@/src/format";
import { useApprovals, useHome, usePolls } from "@/src/hooks/queries";
import { rosterBadges } from "@/src/roster";
import { colors, font, radius, spacing } from "@/src/theme";

export default function DirectorDashboard() {
  const router = useRouter();
  const home = useHome();
  const approvals = useApprovals();
  const polls = usePolls();

  const nights = (home.data?.nights ?? []).filter((n) => n.next_event?.can_manage);
  const orphanNights = (home.data?.nights ?? []).filter(
    (n) => !n.next_event || !n.next_event.can_manage,
  );
  const custom = (home.data?.custom_events ?? []).filter((e) => e.can_manage);
  const pending = approvals.data?.length ?? 0;
  const openPolls = (polls.data ?? []).filter((p) => !p.all_answered).length;

  return (
    <>
      <Stack.Screen options={{ title: "Director dashboard" }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {home.isLoading ? (
          <Loading label="Loading…" />
        ) : home.isError ? (
          <ErrorState
            message={home.error instanceof ApiError ? home.error.detail : "Couldn't load."}
            onRetry={() => home.refetch()}
          />
        ) : (
          <>
            {pending > 0 ? (
              <Card accent="director">
                <View style={styles.alertRow}>
                  <Ionicons name="person-add" size={18} color={colors.gold} />
                  <Text style={styles.alertText}>
                    {pending} player{pending === 1 ? "" : "s"} waiting for approval
                  </Text>
                  <Button
                    label="Review"
                    variant="secondary"
                    onPress={() => router.push("/approvals" as never)}
                    style={styles.alertBtn}
                  />
                </View>
              </Card>
            ) : null}

            <Text style={styles.sectionLabel}>Your nights</Text>
            {nights.length === 0 ? (
              <Card>
                <Text style={styles.muted}>No upcoming events on your nights.</Text>
              </Card>
            ) : (
              nights.map((n) => <NightCard key={n.id} night={n} onManage={() => router.push(`/event/${n.next_event!.id}/manage` as never)} />)
            )}

            {orphanNights.length > 0 ? (
              <Card>
                <Text style={styles.sectionLabelInline}>Need an event</Text>
                {orphanNights.map((n) => (
                  <View key={n.id} style={styles.orphanRow}>
                    <Text style={styles.orphanName}>{n.name}</Text>
                    <Button
                      label="Create next"
                      variant="secondary"
                      onPress={() => router.push("/new-event" as never)}
                      style={styles.alertBtn}
                    />
                  </View>
                ))}
              </Card>
            ) : null}

            {custom.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Other events you manage</Text>
                {custom.map((e) => (
                  <Card key={e.id}>
                    <Text style={styles.nightName}>{e.display_name}</Text>
                    <Text style={styles.meta}>
                      {formatEventDate(e.date)}
                      {e.start_time ? ` · ${formatTime(e.start_time)}` : ""}
                    </Text>
                    <Button
                      label="Manage"
                      variant="secondary"
                      onPress={() => router.push(`/event/${e.id}/manage` as never)}
                    />
                  </Card>
                ))}
              </>
            ) : null}

            <Text style={styles.sectionLabel}>Tools</Text>
            <Card>
              <ToolRow icon="add-circle-outline" label="Create next event" onPress={() => router.push("/new-event" as never)} />
              <ToolRow icon="shuffle-outline" label="Team generator" onPress={() => router.push("/teams" as never)} />
              <ToolRow icon="person-circle-outline" label="Player profiles" onPress={() => router.push("/players" as never)} />
              <ToolRow icon="people-outline" label="Skate-group members" onPress={() => router.push("/skate-groups" as never)} />
              <ToolRow
                icon="bar-chart-outline"
                label={openPolls > 0 ? `Polls (${openPolls} open)` : "Polls"}
                onPress={() => router.push("/polls/manage" as never)}
                last
              />
            </Card>
          </>
        )}
      </ScrollView>
    </>
  );
}

function NightCard({ night, onManage }: { night: HomeNight; onManage: () => void }) {
  const e = night.next_event!;
  const r = e.roster;
  return (
    <Card>
      <Text style={styles.nightName}>{night.name}</Text>
      <Text style={styles.meta}>
        {e.display_name} · {formatEventDate(e.date)}
        {e.start_time ? ` · ${formatTime(e.start_time)}` : ""}
      </Text>
      <View style={styles.tiles}>
        <Tile
          value={`${r.skaters}${r.capacity != null ? `/${r.capacity}` : ""}`}
          label="Skaters"
        />
        <Tile
          value={`${r.goalies}${r.goalies_needed != null ? `/${r.goalies_needed}` : ""}`}
          label="Goalies"
        />
        <Tile value={`${r.waitlist}`} label="Waitlist" />
      </View>
      <View style={styles.badges}>
        {rosterBadges(r).map((b) => (
          <Badge key={b.label} text={b.label} tone={b.tone} />
        ))}
      </View>
      <Button label="Manage event" variant="secondary" onPress={onManage} />
    </Card>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function ToolRow({
  icon,
  label,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable style={[styles.toolRow, !last && styles.toolRowBorder]} onPress={onPress}>
      <Ionicons name={icon} size={18} color={colors.gold} />
      <Text style={styles.toolLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  alertRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  alertText: { color: colors.text, fontSize: font.sm, fontWeight: "600", flex: 1 },
  alertBtn: { flexGrow: 0, paddingHorizontal: spacing.md, minHeight: 34 },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: font.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  sectionLabelInline: {
    color: colors.textMuted,
    fontSize: font.xs,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  muted: { color: colors.textMuted },
  nightName: { color: colors.text, fontSize: font.base, fontWeight: "800" },
  meta: { color: colors.textMuted, fontSize: font.sm },
  tiles: { flexDirection: "row", gap: spacing.sm },
  tile: {
    flex: 1,
    backgroundColor: colors.cardRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  tileValue: { color: colors.text, fontSize: font.md, fontWeight: "800" },
  tileLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 2,
  },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  orphanRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingTop: spacing.xs },
  orphanName: { color: colors.text, fontSize: font.sm, flex: 1 },
  toolRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  toolRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  toolLabel: { color: colors.text, fontSize: font.base, fontWeight: "600", flex: 1 },
});

import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";

import type { EventSummary } from "@/src/api/types";
import { Badge } from "@/src/components/ui";
import { formatEventDate, formatTime, rosterLabel } from "@/src/format";
import { colors, radius, rsvpColor, spacing } from "@/src/theme";

/** Needs-skaters / needs-goalies badges, mirroring the web home page. */
export function needBadges(e: EventSummary): { label: string; color: string }[] {
  const r = e.roster;
  const out: { label: string; color: string }[] = [];
  if (r.is_full) out.push({ label: "FULL", color: colors.amber });
  else if (r.skater_spots_open != null && r.skater_spots_open > 0)
    out.push({ label: "NEED SKATERS", color: colors.green });
  if (r.goalie_spots_open != null && r.goalie_spots_open > 0)
    out.push({ label: "NEED GOALIES", color: colors.blue });
  return out;
}

export function EventCard({ event, compact = false }: { event: EventSummary; compact?: boolean }) {
  const status = event.my_rsvp?.status ?? null;
  return (
    <Link href={`/event/${event.id}`} asChild>
      <Pressable style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.title}>{event.display_name}</Text>
          {status ? (
            <Badge text={status.replace("_", " ")} color={rsvpColor[status] ?? colors.textMuted} />
          ) : event.can_manage ? (
            <Badge text="MANAGE" color={colors.border} />
          ) : null}
        </View>
        <Text style={styles.meta}>
          {formatEventDate(event.date)}
          {event.start_time ? ` · ${formatTime(event.start_time)}` : ""}
          {!compact && event.location ? ` · ${event.location}` : ""}
        </Text>
        <View style={styles.bottomRow}>
          <Text style={styles.roster}>
            {rosterLabel(event.roster.skaters, event.roster.capacity)}
            {event.roster.goalies_needed != null
              ? ` · ${event.roster.goalies}/${event.roster.goalies_needed} G`
              : ""}
          </Text>
          <View style={styles.badges}>
            {needBadges(event).map((b) => (
              <Badge key={b.label} text={b.label} color={b.color} />
            ))}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  title: { color: colors.text, fontSize: 16, fontWeight: "700", flexShrink: 1 },
  meta: { color: colors.textMuted, fontSize: 13 },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  roster: { color: colors.text, fontSize: 14, flexShrink: 1 },
  badges: { flexDirection: "row", gap: spacing.xs, flexShrink: 0 },
});

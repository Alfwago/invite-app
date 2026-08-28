import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";

import type { EventSummary, RsvpStatus } from "@/src/api/types";
import { Badge, FillBar, type BadgeTone } from "@/src/components/ui";
import { formatEventDate, formatTime, rosterLabel } from "@/src/format";
import { fillPct, rosterBadges, rosterHealth } from "@/src/roster";
import { colors, font, radius, spacing } from "@/src/theme";

const STATUS_TONE: Record<RsvpStatus, BadgeTone> = {
  YES: "good",
  MAYBE: "caution",
  WAITLIST: "caution",
  NO: "neutral",
  NO_RESPONSE: "neutral",
};

const STATUS_LABEL: Record<RsvpStatus, string> = {
  YES: "GOING",
  MAYBE: "MAYBE",
  WAITLIST: "WAITLIST",
  NO: "NOT GOING",
  NO_RESPONSE: "NO RESPONSE",
};

export function EventCard({ event, compact = false }: { event: EventSummary; compact?: boolean }) {
  const status = event.my_rsvp?.status ?? null;
  const r = event.roster;
  const pct = fillPct(r);

  return (
    <Link href={`/event/${event.id}`} asChild>
      <Pressable style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.title}>{event.display_name}</Text>
          {status ? (
            <Badge text={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />
          ) : event.can_manage ? (
            <Badge text="MANAGE" tone="neutral" />
          ) : null}
        </View>

        <Text style={styles.meta}>
          {formatEventDate(event.date)}
          {event.start_time ? ` · ${formatTime(event.start_time)}` : ""}
          {!compact && event.location ? ` · ${event.location}` : ""}
        </Text>

        {pct != null ? <FillBar pct={pct} tone={rosterHealth(r)} /> : null}

        <View style={styles.bottomRow}>
          <Text style={styles.roster}>
            {rosterLabel(r.skaters, r.capacity)}
            {r.goalies_needed != null ? ` · ${r.goalies} / ${r.goalies_needed} G` : ""}
          </Text>
          <View style={styles.badges}>
            {rosterBadges(r).map((b) => (
              <Badge key={b.label} text={b.label} tone={b.tone} />
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
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: { color: colors.text, fontSize: font.base, fontWeight: "700", flexShrink: 1 },
  meta: { color: colors.textMuted, fontSize: font.sm },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  roster: { color: colors.text, fontSize: font.sm, flexShrink: 1 },
  badges: { flexDirection: "row", gap: spacing.xs, flexShrink: 0, flexWrap: "wrap" },
});

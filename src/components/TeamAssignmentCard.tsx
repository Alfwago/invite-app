import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { TeamAssignment } from "@/src/api/types";
import { Card } from "@/src/components/ui";
import { colors, font, radius, spacing } from "@/src/theme";

// Gold ≈ league gold; Black ≈ a light neutral grey so it reads on the black bg.
const TEAM_TINT: Record<TeamAssignment["team"], string> = {
  Gold: colors.gold,
  Black: "#c9ced3",
};

function postedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

/** The "You're on Gold" card, shared by Home and the event detail screen.
 *  Render only when the assignment is non-null. */
export function TeamAssignmentCard({ assignment }: { assignment: TeamAssignment }) {
  const tint = TEAM_TINT[assignment.team];
  const mates = assignment.teammates.join(", ");
  const line = assignment.goalie
    ? `${mates}${mates ? " · " : ""}in net: ${assignment.goalie}`
    : mates;

  return (
    <Card>
      {assignment.moved_from ? (
        <View style={styles.moved}>
          <Ionicons name="swap-horizontal" size={14} color={colors.amber} />
          <Text style={styles.movedText}>
            Line change — you were on {assignment.moved_from}, now {assignment.team}.
          </Text>
        </View>
      ) : null}

      <View style={styles.head}>
        <Ionicons name="shirt" size={22} color={tint} />
        <Text style={styles.team}>
          You&apos;re on <Text style={[styles.teamName, { color: tint }]}>{assignment.team}</Text>
        </Text>
      </View>

      <Text style={[styles.jersey, { color: tint }]}>{assignment.jersey}</Text>
      {line ? <Text style={styles.mates}>{line}</Text> : null}
      <Text style={styles.posted}>Posted {postedAt(assignment.published_at)}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  moved: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.amberDim,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  movedText: { color: colors.amber, fontSize: font.xs, fontWeight: "700", flex: 1 },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  team: { color: colors.text, fontSize: font.base, fontWeight: "600" },
  teamName: { fontWeight: "800" },
  jersey: { fontSize: font.sm, fontWeight: "800", marginTop: spacing.xs },
  mates: { color: colors.textMuted, fontSize: font.sm, marginTop: 2 },
  posted: { color: colors.textMuted, fontSize: font.xs, marginTop: spacing.sm },
});

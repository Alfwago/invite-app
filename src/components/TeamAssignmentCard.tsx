import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { TeamAssignment } from "@/src/api/types";
import { Card } from "@/src/components/ui";
import { colors, font, radius, spacing } from "@/src/theme";

// Gold ≈ league gold; Black ≈ a light neutral grey so it reads on the black bg.
export const TEAM_TINT: Record<TeamAssignment["team"], string> = {
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

/** Minimal "You're on Gold" card, shared by Home and the event detail screen.
 *  Render only when the assignment is non-null. `onPress` (Home) makes it a
 *  link — it shows a chevron and opens the event's roster with teams. */
export function TeamAssignmentCard({
  assignment,
  onPress,
}: {
  assignment: TeamAssignment;
  onPress?: () => void;
}) {
  const tint = TEAM_TINT[assignment.team];

  const card = (
    <Card>
      <View style={styles.row}>
        <Ionicons name="shirt" size={22} color={tint} />
        <Text style={styles.team}>
          You&apos;re on <Text style={[styles.teamName, { color: tint }]}>{assignment.team}</Text>
        </Text>
        {assignment.moved_from ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Updated</Text>
          </View>
        ) : null}
        {onPress ? (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={styles.chevron} />
        ) : null}
      </View>
      <Text style={styles.posted}>Posted {postedAt(assignment.published_at)}</Text>
    </Card>
  );

  if (!onPress) return card;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`You're on ${assignment.team}. View the roster with teams.`}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {card}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  team: { color: colors.text, fontSize: font.base, fontWeight: "600" },
  teamName: { fontWeight: "800" },
  badge: {
    backgroundColor: colors.amberDim,
    borderColor: colors.amber,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    color: colors.amber,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  posted: { color: colors.textMuted, fontSize: font.xs, marginTop: spacing.xs },
  chevron: { marginLeft: "auto" },
  pressed: { opacity: 0.7 },
});

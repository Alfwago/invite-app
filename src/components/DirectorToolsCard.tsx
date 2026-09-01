import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/src/auth/AuthContext";
import { Card } from "@/src/components/ui";
import { useApprovals } from "@/src/hooks/queries";
import { colors, font, spacing } from "@/src/theme";

/**
 * Quick links to the director-only management screens. Renders nothing for a
 * non-director; individual rows are gated by role (notices → president).
 */
export function DirectorToolsCard() {
  const { me } = useAuth();
  const router = useRouter();
  const approvals = useApprovals();
  const pendingCount = me?.is_director ? (approvals.data?.length ?? 0) : 0;

  if (!me?.is_director) return null;

  const rows: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    href: string;
    badge?: number;
  }[] = [
    { label: "Team generator", icon: "shuffle-outline", href: "/teams" },
    { label: "Player profiles", icon: "person-circle-outline", href: "/players" },
    { label: "Player approvals", icon: "person-add-outline", href: "/approvals", badge: pendingCount },
    { label: "Skate-group members", icon: "people-outline", href: "/skate-groups" },
  ];
  if (me.is_president) {
    rows.push({ label: "League notices", icon: "megaphone-outline", href: "/notices" });
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Director tools</Text>
      <Card>
        {rows.map((r, i) => (
          <Pressable
            key={r.href}
            style={[styles.row, i < rows.length - 1 && styles.rowBorder]}
            onPress={() => router.push(r.href as never)}
          >
            <Ionicons name={r.icon} size={18} color={colors.gold} />
            <Text style={styles.label}>{r.label}</Text>
            {r.badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{r.badge > 9 ? "9+" : r.badge}</Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.sm },
  heading: {
    color: colors.gold,
    fontSize: font.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { color: colors.text, fontSize: font.base, fontWeight: "600", flex: 1 },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
});

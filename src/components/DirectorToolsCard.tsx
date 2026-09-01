import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/src/auth/AuthContext";
import { Card } from "@/src/components/ui";
import { colors, font, spacing } from "@/src/theme";

/**
 * Quick links to the director-only management screens. Renders nothing for a
 * non-director; individual rows are gated by role (notices → president).
 */
export function DirectorToolsCard() {
  const { me } = useAuth();
  const router = useRouter();

  if (!me?.is_director) return null;

  const rows: { label: string; icon: keyof typeof Ionicons.glyphMap; href: string }[] = [
    { label: "Player profiles", icon: "person-circle-outline", href: "/players" },
    { label: "Rating requests", icon: "star-outline", href: "/rating-requests" },
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
});

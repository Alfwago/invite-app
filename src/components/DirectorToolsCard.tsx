import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/src/auth/AuthContext";
import { Card } from "@/src/components/ui";
import { colors, font, spacing } from "@/src/theme";

/**
 * Quick links to the most-used director screens. The full set lives on the
 * Director dashboard; this is the shortlist for Home. Renders nothing for a
 * non-director; the notices row is president-only.
 */
export function DirectorToolsCard() {
  const { me } = useAuth();
  const router = useRouter();

  if (!me?.is_director) return null;

  const rows: { label: string; icon: keyof typeof Ionicons.glyphMap; href: string }[] = [
    { label: "Director dashboard", icon: "grid-outline", href: "/director" },
    { label: "Team generator", icon: "shuffle-outline", href: "/teams" },
    { label: "Polls", icon: "bar-chart-outline", href: "/polls/manage" },
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

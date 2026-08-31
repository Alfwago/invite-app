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

  const rows: { label: string; icon: keyof typeof Ionicons.glyphMap; href: string }[] = [];
  if (me.is_president) {
    rows.push({ label: "League notices", icon: "megaphone-outline", href: "/notices" });
  }
  if (rows.length === 0) return null;

  return (
    <Card accent="director">
      <Text style={styles.heading}>Director tools</Text>
      {rows.map((r) => (
        <Pressable key={r.href} style={styles.row} onPress={() => router.push(r.href as never)}>
          <Ionicons name={r.icon} size={18} color={colors.gold} />
          <Text style={styles.label}>{r.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.gold,
    fontSize: font.xs,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: { color: colors.text, fontSize: font.base, fontWeight: "600", flex: 1 },
});

import { ScrollView, StyleSheet, Text, View } from "react-native";

import { API_BASE } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { Badge, Button, Card } from "@/src/components/ui";
import { colors, spacing } from "@/src/theme";

export default function ProfileScreen() {
  const { me, signOut } = useAuth();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.name}>{me?.full_name ?? me?.username}</Text>
        <Text style={styles.muted}>{me?.email}</Text>
        <View style={styles.badges}>
          {me?.is_director ? <Badge text="DIRECTOR" color={colors.gold} /> : null}
          {me?.is_goalie ? <Badge text="GOALIE" color={colors.blue} /> : null}
          {me?.is_goalie_skater ? <Badge text="GOALIE / SKATER" color={colors.blue} /> : null}
          {me?.is_non_playing ? <Badge text="NON-PLAYING" color={colors.textMuted} /> : null}
        </View>
        {me && !me.email_verified ? (
          <Text style={styles.warn}>Your email isn't verified — you can't RSVP yet.</Text>
        ) : null}
        {me && !me.director_approved && !me.is_director ? (
          <Text style={styles.warn}>Your account is awaiting director approval.</Text>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.rowLabel}>Phone</Text>
        <Text style={styles.rowValue}>{me?.phone_number || "—"}</Text>
        <Text style={styles.rowLabel}>Text alerts</Text>
        <Text style={styles.rowValue}>{me?.sms_opt_in ? "On" : "Off"}</Text>
        <Text style={styles.hint}>
          Profile details are edited on the website for now.
        </Text>
      </Card>

      <Button label="Sign out" variant="danger" onPress={signOut} />
      <Text style={styles.server}>{API_BASE}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  name: { color: colors.text, fontSize: 20, fontWeight: "800" },
  muted: { color: colors.textMuted },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  warn: { color: colors.amber, fontWeight: "600" },
  rowLabel: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase" },
  rowValue: { color: colors.text, fontSize: 16 },
  hint: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm },
  server: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
});

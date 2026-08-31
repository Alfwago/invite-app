import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { API_BASE } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { Badge, Card } from "@/src/components/ui";
import { colors, font, radius, spacing } from "@/src/theme";

const CREST = require("@/assets/brand/crest.jpg");

export default function ProfileScreen() {
  const { me } = useAuth();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.idRow}>
          <Image source={CREST} style={styles.crest} />
          <View style={styles.idText}>
            <Text style={styles.name}>{me?.full_name ?? me?.username}</Text>
            <Text style={styles.muted}>{me?.email}</Text>
          </View>
        </View>
        <View style={styles.badges}>
          {me?.is_director ? <Badge text="DIRECTOR" tone="gold" /> : null}
          {me?.is_goalie ? <Badge text="GOALIE" tone="neutral" /> : null}
          {me?.is_goalie_skater ? <Badge text="GOALIE / SKATER" tone="neutral" /> : null}
          {me?.is_non_playing ? <Badge text="NON-PLAYING" tone="neutral" /> : null}
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
        <Text style={styles.hint}>Profile details are edited on the website for now.</Text>
      </Card>

      <Text style={styles.server}>{API_BASE}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  idRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  crest: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  idText: { flexShrink: 1 },
  name: { color: colors.text, fontSize: font.lg, fontWeight: "800" },
  muted: { color: colors.textMuted },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  warn: { color: colors.amber, fontWeight: "600" },
  rowLabel: { color: colors.textMuted, fontSize: font.xs, textTransform: "uppercase", letterSpacing: 0.5 },
  rowValue: { color: colors.text, fontSize: font.base },
  hint: { color: colors.textMuted, fontSize: font.sm, marginTop: spacing.sm },
  server: { color: colors.textMuted, fontSize: font.xs, textAlign: "center" },
});

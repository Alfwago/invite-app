import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ApiError } from "@/src/api/client";
import type { DirectoryEntry } from "@/src/api/types";
import { useAuth } from "@/src/auth/AuthContext";
import { Tap } from "@/src/components/Tap";
import { Badge, Card, ErrorState, Loading } from "@/src/components/ui";
import { useDirectors } from "@/src/hooks/queries";
import { colors, font, radius, spacing } from "@/src/theme";

/** Who the Skate Directors are and which skate groups (nights) each runs
 *  (1.8.0, owner 2026-10-20). Everyone can see it, like the website's Home
 *  "Director contacts". Message opens an in-app conversation. */
export default function SkateDirectorsScreen() {
  const query = useDirectors();
  const { me } = useAuth();

  return (
    <>
      <Stack.Screen options={{ title: "Skate Directors" }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {query.isLoading ? (
          <Loading label="Loading…" />
        ) : query.isError ? (
          <ErrorState
            message={query.error instanceof ApiError ? query.error.detail : "Couldn't load the directors."}
            onRetry={() => query.refetch()}
          />
        ) : (query.data ?? []).length === 0 ? (
          <Text style={styles.muted}>No directors listed yet.</Text>
        ) : (
          (query.data ?? []).map((d) => <DirectorCard key={d.id} d={d} isMe={d.id === me?.id} />)
        )}
      </ScrollView>
    </>
  );
}

function DirectorCard({ d, isMe }: { d: DirectoryEntry; isMe: boolean }) {
  const router = useRouter();
  const open = (url: string) => Linking.openURL(url).catch(() => {});
  return (
    <Card>
      <View style={styles.head}>
        <Text style={styles.name}>{d.name}</Text>
        {d.role !== "Director" ? <Badge text={d.role.toUpperCase()} tone="gold" /> : null}
      </View>
      {d.nights.length > 0 ? (
        d.nights.map((n) => (
          <View key={n.id} style={styles.nightRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.gold} />
            <Text style={styles.nightName}>{n.name}</Text>
            <Text style={styles.nightRole}>{n.role}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.muted}>{d.role === "Director" ? "No skate group yet" : "All skate groups"}</Text>
      )}
      {!isMe ? (
        <View style={styles.actions}>
          <Action icon="chatbubble-outline" label="Message" onPress={() => router.push(`/inbox/${d.id}` as never)} />
          {d.email ? <Action icon="mail-outline" label="Email" onPress={() => open(`mailto:${d.email}`)} /> : null}
          {d.phone ? <Action icon="call-outline" label="Call" onPress={() => open(`tel:${d.phone}`)} /> : null}
          {d.phone ? <Action icon="chatbox-outline" label="Text" onPress={() => open(`sms:${d.phone}`)} /> : null}
        </View>
      ) : null}
    </Card>
  );
}

function Action({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Tap onPress={onPress} style={styles.action} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={16} color={colors.gold} />
      <Text style={styles.actionText}>{label}</Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  muted: { color: colors.textMuted, fontSize: font.sm },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { color: colors.text, fontSize: font.base, fontWeight: "800", flexShrink: 1 },
  nightRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  nightName: { color: colors.text, fontSize: font.sm, fontWeight: "600", flexShrink: 1 },
  nightRole: { color: colors.textMuted, fontSize: font.xs, marginLeft: "auto" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: 4 },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: { color: colors.text, fontSize: font.xs, fontWeight: "700" },
});

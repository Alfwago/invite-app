import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ApiError } from "@/src/api/client";
import { Card, ErrorState, Loading } from "@/src/components/ui";
import { useNights } from "@/src/hooks/queries";
import { colors, font, spacing } from "@/src/theme";

export default function SkateGroupsScreen() {
  const nights = useNights();
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: "Skate-group members" }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {nights.isLoading ? (
          <Loading label="Loading…" />
        ) : nights.isError ? (
          <ErrorState
            message={
              nights.error instanceof ApiError ? nights.error.detail : "Couldn't load skate groups."
            }
            onRetry={() => nights.refetch()}
          />
        ) : (
          <Card>
            <Text style={styles.hint}>Pick a skate group to manage who&apos;s on it.</Text>
            {(nights.data ?? []).map((n) => (
              <Pressable
                key={n.id}
                style={styles.row}
                onPress={() => router.push(`/night/${n.id}/members` as never)}
              >
                <Text style={styles.name}>{n.name}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </Card>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  hint: { color: colors.textMuted, fontSize: font.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: { color: colors.text, fontSize: font.base, fontWeight: "600" },
});

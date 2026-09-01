import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ApiError } from "@/src/api/client";
import { Card, ErrorState, Loading } from "@/src/components/ui";
import { usePolls } from "@/src/hooks/queries";
import { colors, font, radius, spacing } from "@/src/theme";

export default function PollsScreen() {
  const query = usePolls();
  const router = useRouter();
  const polls = query.data ?? [];

  return (
    <>
      <Stack.Screen options={{ title: "Polls" }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {query.isLoading ? (
          <Loading label="Loading…" />
        ) : query.isError ? (
          <ErrorState
            message={query.error instanceof ApiError ? query.error.detail : "Couldn't load polls."}
            onRetry={() => query.refetch()}
          />
        ) : polls.length === 0 ? (
          <Text style={styles.empty}>No open polls right now.</Text>
        ) : (
          polls.map((p) => (
            <Card key={p.id}>
              <Pressable style={styles.row} onPress={() => router.push(`/polls/${p.id}` as never)}>
                <View style={styles.main}>
                  <Text style={styles.title}>{p.title}</Text>
                  <Text style={styles.meta}>
                    {p.all_answered
                      ? "Answered — tap to review"
                      : `${p.answered_q}/${p.total_q} answered`}
                  </Text>
                </View>
                {p.all_answered ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.green} />
                ) : (
                  <View style={styles.dot} />
                )}
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            </Card>
          ))
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  empty: { color: colors.textMuted, textAlign: "center", padding: spacing.xl },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  main: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: font.base, fontWeight: "700" },
  meta: { color: colors.textMuted, fontSize: font.sm },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.gold,
  },
});

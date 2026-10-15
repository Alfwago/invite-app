import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ApiError } from "@/src/api/client";
import { Card, ErrorState, Loading } from "@/src/components/ui";
import { useClosedPolls } from "@/src/hooks/queries";
import { audienceLabel } from "@/src/polls";
import { colors, font, radius, spacing } from "@/src/theme";

/** A closed poll's results for the players who could vote on it (server
 *  0.36.0+, owner 1d C: results only after a poll closes). Directors keep
 *  their live results under Director → Polls. */
export default function ClosedPollResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pollId = Number(id);
  const query = useClosedPolls();
  const poll = useMemo(() => query.data?.find((p) => p.id === pollId), [query.data, pollId]);

  if (query.isLoading) return <Loading label="Loading…" />;
  if (query.isError || !poll) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.detail : "Poll not found."}
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Results" }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <Text style={styles.title}>{poll.title}</Text>
          {poll.description ? <Text style={styles.desc}>{poll.description}</Text> : null}
          <Text style={styles.audience}>For: {audienceLabel(poll)} · Closed</Text>
        </View>
        {poll.questions.map((q) => (
          <Card key={q.id}>
            <Text style={styles.qText}>{q.text}</Text>
            {q.choices.map((c) => {
              const mine = q.my_choice_id === c.id;
              return (
                <View
                  key={c.id}
                  style={styles.choiceRow}
                  accessibilityLabel={`${c.text}, ${c.count} votes, ${c.pct} percent${mine ? ", your vote" : ""}`}
                >
                  <View style={[styles.bar, { width: `${Math.max(c.pct, 2)}%` }]} />
                  <View style={styles.choiceLine}>
                    {mine ? <Ionicons name="checkmark-circle" size={14} color={colors.gold} /> : null}
                    <Text style={[styles.choiceLabel, mine && styles.choiceMine]} numberOfLines={2}>
                      {c.text}
                    </Text>
                    <Text style={styles.count}>
                      {c.count} ({c.pct}%)
                    </Text>
                  </View>
                </View>
              );
            })}
            <Text style={styles.total}>
              {q.total} vote{q.total === 1 ? "" : "s"}
              {q.my_choice_id != null ? " · ✓ your vote" : ""}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  head: { gap: 4 },
  title: { color: colors.text, fontSize: 18, fontWeight: "800" },
  desc: { color: colors.textMuted, fontSize: font.sm, lineHeight: 20 },
  audience: { color: colors.gold, fontSize: font.xs, fontWeight: "700" },
  qText: { color: colors.text, fontSize: font.base, fontWeight: "700" },
  choiceRow: {
    justifyContent: "center",
    minHeight: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.cardRaised,
    overflow: "hidden",
  },
  bar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.goldDim,
    borderRightWidth: 2,
    borderRightColor: colors.gold,
  },
  choiceLine: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.sm },
  choiceLabel: { color: colors.text, fontSize: font.sm, fontWeight: "600", flex: 1 },
  choiceMine: { color: colors.gold, fontWeight: "800" },
  count: { color: colors.text, fontSize: font.xs, fontWeight: "700" },
  total: { color: colors.textMuted, fontSize: font.xs },
});

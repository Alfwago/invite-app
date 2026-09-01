import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ApiError } from "@/src/api/client";
import { Button, Card, ErrorState, Loading } from "@/src/components/ui";
import { usePollActions, usePolls } from "@/src/hooks/queries";
import { colors, font, radius, spacing } from "@/src/theme";

export default function PollDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pollId = Number(id);
  const router = useRouter();
  const query = usePolls();
  const { vote, dismiss } = usePollActions();

  const poll = useMemo(() => query.data?.find((p) => p.id === pollId), [query.data, pollId]);
  const [picks, setPicks] = useState<Record<number, number>>({});

  if (query.isLoading) return <Loading label="Loading…" />;
  if (query.isError || !poll) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.detail : "Poll not found."}
        onRetry={() => query.refetch()}
      />
    );
  }

  const unanswered = poll.questions.filter((q) => q.my_choice_id == null);
  const readyToSubmit = unanswered.length > 0 && unanswered.every((q) => picks[q.id] != null);

  async function submit() {
    try {
      await vote.mutateAsync({ pollId, answers: picks });
      setPicks({});
    } catch (e) {
      Alert.alert("Couldn't submit", e instanceof ApiError ? e.detail : "Try again.");
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: poll.title }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {poll.description ? <Text style={styles.desc}>{poll.description}</Text> : null}

        {poll.questions.map((q) => {
          const locked = q.my_choice_id != null;
          const selected = locked ? q.my_choice_id : picks[q.id];
          return (
            <Card key={q.id}>
              <Text style={styles.qText}>{q.text}</Text>
              {q.choices.map((c) => {
                const on = selected === c.id;
                return (
                  <Pressable
                    key={c.id}
                    disabled={locked}
                    onPress={() => setPicks((p) => ({ ...p, [q.id]: c.id }))}
                    style={[styles.choice, on && styles.choiceOn, locked && !on && styles.choiceDim]}
                  >
                    <Ionicons
                      name={on ? "radio-button-on" : "radio-button-off"}
                      size={18}
                      color={on ? colors.gold : colors.textMuted}
                    />
                    <Text style={[styles.choiceText, on && styles.choiceTextOn]}>{c.text}</Text>
                  </Pressable>
                );
              })}
              {locked ? <Text style={styles.answered}>Your answer is locked in.</Text> : null}
            </Card>
          );
        })}

        {unanswered.length > 0 ? (
          <Button
            label="Submit answers"
            onPress={submit}
            loading={vote.isPending}
            disabled={!readyToSubmit}
          />
        ) : (
          <Button
            label="Hide from home"
            variant="secondary"
            onPress={() =>
              dismiss.mutate(pollId, {
                onSuccess: () => router.back(),
                onError: (e) =>
                  Alert.alert("Couldn't hide", e instanceof ApiError ? e.detail : "Try again."),
              })
            }
            loading={dismiss.isPending}
          />
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  desc: { color: colors.textMuted, fontSize: font.sm, lineHeight: 20 },
  qText: { color: colors.text, fontSize: font.base, fontWeight: "700" },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardRaised,
  },
  choiceOn: { borderColor: colors.gold, backgroundColor: colors.goldDim },
  choiceDim: { opacity: 0.5 },
  choiceText: { color: colors.text, fontSize: font.sm, flex: 1 },
  choiceTextOn: { color: colors.gold, fontWeight: "700" },
  answered: { color: colors.textMuted, fontSize: font.xs, fontStyle: "italic" },
});

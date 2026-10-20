import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ApiError } from "@/src/api/client";
import type { PollSummary } from "@/src/api/types";
import { Tap } from "@/src/components/Tap";
import { Badge, Button, Card, ErrorState, Loading } from "@/src/components/ui";
import {
  useManagePolls,
  usePollAdminMutations,
  usePollResults,
} from "@/src/hooks/queries";
import { audienceLabel } from "@/src/polls";
import { colors, font, radius, spacing } from "@/src/theme";

export default function ManagePollsScreen() {
  const router = useRouter();
  const query = useManagePolls();
  const [open, setOpen] = useState<number | null>(null);
  const polls = query.data?.polls ?? [];

  return (
    <>
      <Stack.Screen options={{ title: "Polls" }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Button label="New poll" onPress={() => router.push("/polls/new" as never)} />

        {query.isLoading ? (
          <Loading label="Loading…" />
        ) : query.isError ? (
          <ErrorState
            message={query.error instanceof ApiError ? query.error.detail : "Couldn't load."}
            onRetry={() => query.refetch()}
          />
        ) : polls.length === 0 ? (
          <Text style={styles.empty}>No polls yet.</Text>
        ) : (
          polls.map((p) => (
            <PollCard
              key={p.id}
              poll={p}
              expanded={open === p.id}
              onToggle={() => setOpen((o) => (o === p.id ? null : p.id))}
            />
          ))
        )}
      </ScrollView>
    </>
  );
}

function PollCard({
  poll,
  expanded,
  onToggle,
}: {
  poll: PollSummary;
  expanded: boolean;
  onToggle: () => void;
}) {
  const results = usePollResults(expanded ? poll.id : undefined);
  const { update, remove } = usePollAdminMutations();

  function confirmDelete() {
    Alert.alert("Delete poll?", `"${poll.title}" and its votes are gone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(poll.id) },
    ]);
  }

  return (
    <Card>
      <View style={styles.head} onStartShouldSetResponder={() => true} onResponderRelease={onToggle}>
        <View style={styles.headMain}>
          <Text style={styles.title}>{poll.title}</Text>
          <Text style={styles.meta}>
            {poll.question_count} question{poll.question_count === 1 ? "" : "s"} ·{" "}
            {poll.total_votes} vote{poll.total_votes === 1 ? "" : "s"}
          </Text>
          {audienceLabel(poll) ? (
            <Text style={styles.audience} numberOfLines={1}>
              For: {audienceLabel(poll)}
            </Text>
          ) : null}
        </View>
        <Badge
          text={poll.is_open ? "OPEN" : "CLOSED"}
          tone={poll.is_open ? "good" : "neutral"}
        />
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.textMuted}
        />
      </View>

      {expanded ? (
        <View style={styles.body}>
          {results.isLoading ? (
            <Loading label="Loading results…" />
          ) : results.data ? (
            <>
              {results.data.questions.map((q) => (
                <View key={q.id} style={styles.q}>
                  <Text style={styles.qText}>{q.text}</Text>
                  {q.choices.map((c) => (
                    <View key={c.id} style={styles.choiceWrap}>
                      <View style={styles.choiceRow}>
                        <View style={[styles.bar, { width: `${Math.max(c.pct, 2)}%` }]} />
                        <Text style={styles.choiceLabel}>
                          {c.text} — {c.count} ({c.pct}%)
                        </Text>
                      </View>
                      {/* Names shown polls (server 0.36.2+): who picked it. */}
                      {results.data?.show_names && c.voters?.length ? (
                        <Text style={styles.voters}>{c.voters.join(" · ")}</Text>
                      ) : null}
                    </View>
                  ))}
                  <Text style={styles.qTotal}>{q.total} responses</Text>
                </View>
              ))}
              <View style={styles.actions}>
                {results.data.show_names !== undefined ? (
                  <ResponsesSwitch
                    showNames={!!results.data.show_names}
                    busy={update.isPending}
                    onChange={(showNames) =>
                      update.mutate({ id: poll.id, body: { show_names: showNames } })
                    }
                  />
                ) : null}
                <Button
                  label={poll.is_open ? "Close poll" : "Reopen poll"}
                  variant="secondary"
                  loading={update.isPending}
                  onPress={() =>
                    update.mutate({
                      id: poll.id,
                      body: { status: poll.is_open ? "CLOSED" : "ACTIVE" },
                    })
                  }
                />
                <Button label="Delete" variant="danger" onPress={confirmDelete} loading={remove.isPending} />
              </View>
            </>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

/** Anonymous ⇄ Names shown (server 0.36.2+). Never touches the votes. */
function ResponsesSwitch({
  showNames,
  busy,
  onChange,
}: {
  showNames: boolean;
  busy: boolean;
  onChange: (showNames: boolean) => void;
}) {
  return (
    <View style={styles.responses}>
      <Text style={styles.responsesLabel}>Responses</Text>
      <View style={styles.segment}>
        {[
          { key: false, label: "Anonymous" },
          { key: true, label: "Names shown" },
        ].map((o) => {
          const on = o.key === showNames;
          return (
            <Tap
              key={o.label}
              onPress={() => !on && !busy && onChange(o.key)}
              style={[styles.segBtn, on && styles.segBtnOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: busy }}
            >
              <Text style={[styles.segText, on && styles.segTextOn]}>{o.label}</Text>
            </Tap>
          );
        })}
      </View>
      <Text style={styles.responsesHint}>
        {showNames ? "You can see who voted for what. Players only see counts." : "Results show counts only."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  empty: { color: colors.textMuted, textAlign: "center", padding: spacing.xl },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headMain: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: font.base, fontWeight: "700" },
  meta: { color: colors.textMuted, fontSize: font.sm },
  audience: { color: colors.gold, fontSize: font.xs, fontWeight: "700" },
  body: { gap: spacing.md, marginTop: spacing.md },
  q: { gap: 4 },
  qText: { color: colors.text, fontSize: font.sm, fontWeight: "700" },
  choiceRow: {
    justifyContent: "center",
    minHeight: 24,
    borderRadius: radius.sm,
    backgroundColor: colors.cardRaised,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
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
  choiceLabel: { color: colors.text, fontSize: font.xs, fontWeight: "600" },
  qTotal: { color: colors.textMuted, fontSize: font.xs },
  actions: { gap: spacing.sm },
  choiceWrap: { gap: 2 },
  voters: { color: colors.textMuted, fontSize: font.xs, lineHeight: 16, paddingHorizontal: spacing.sm },
  responses: { gap: 6 },
  responsesLabel: { color: colors.text, fontSize: font.sm, fontWeight: "700" },
  responsesHint: { color: colors.textMuted, fontSize: font.xs },
  segment: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  segBtn: { flex: 1, paddingVertical: 8, alignItems: "center", backgroundColor: colors.card },
  segBtnOn: { backgroundColor: colors.gold },
  segText: { color: colors.text, fontSize: font.sm, fontWeight: "700" },
  segTextOn: { color: colors.bg },
});

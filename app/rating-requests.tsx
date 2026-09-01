import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import { ApiError } from "@/src/api/client";
import type { RatingRequest } from "@/src/api/types";
import { Button, Card, ErrorState, Loading } from "@/src/components/ui";
import { useDecideRatingRequest, useRatingRequests } from "@/src/hooks/queries";
import { colors, font, radius, spacing } from "@/src/theme";

const FIELDS: { key: keyof RatingRequest["current"]; label: string }[] = [
  { key: "hockey_sense", label: "Hockey sense" },
  { key: "skating", label: "Skating" },
  { key: "defense", label: "Defense" },
  { key: "offense", label: "Offense" },
  { key: "goalie", label: "Goalie" },
];

export default function RatingRequestsScreen() {
  const query = useRatingRequests();
  const decide = useDecideRatingRequest();
  const router = useRouter();

  const inbox = query.data?.inbox ?? [];
  const mine = query.data?.mine ?? [];

  function act(id: number, decision: "APPROVED" | "DECLINED") {
    decide.mutate(
      { id, decision },
      {
        onError: (e) =>
          Alert.alert("Couldn't save", e instanceof ApiError ? e.detail : "Try again."),
      },
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Rating requests" }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {query.isLoading ? (
          <Loading label="Loading…" />
        ) : query.isError ? (
          <ErrorState
            message={query.error instanceof ApiError ? query.error.detail : "Couldn't load requests."}
            onRetry={() => query.refetch()}
          />
        ) : (
          <>
            <Text style={styles.section}>To review ({inbox.length})</Text>
            {inbox.length === 0 ? (
              <Text style={styles.empty}>Nothing waiting on you.</Text>
            ) : (
              inbox.map((r) => (
                <RequestCard key={r.id} req={r} onOpen={() => router.push(`/players/${r.player_id}` as never)}>
                  <View style={styles.actions}>
                    <Button
                      label="Approve"
                      onPress={() => act(r.id, "APPROVED")}
                      loading={decide.isPending}
                    />
                    <Button
                      label="Decline"
                      variant="danger"
                      onPress={() => act(r.id, "DECLINED")}
                      loading={decide.isPending}
                    />
                  </View>
                </RequestCard>
              ))
            )}

            {mine.length > 0 ? (
              <>
                <Text style={styles.section}>Yours, awaiting another director</Text>
                {mine.map((r) => (
                  <RequestCard key={r.id} req={r} onOpen={() => router.push(`/players/${r.player_id}` as never)} />
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </>
  );
}

function RequestCard({
  req,
  onOpen,
  children,
}: {
  req: RatingRequest;
  onOpen: () => void;
  children?: React.ReactNode;
}) {
  const changed = FIELDS.filter((f) => req.current[f.key] !== req.proposed[f.key]);
  return (
    <Card>
      <Text style={styles.player} onPress={onOpen}>
        {req.player_name} · {req.night.name}
      </Text>
      {changed.map((f) => (
        <Text key={f.key} style={styles.change}>
          {f.label}: <Text style={styles.from}>{req.current[f.key]}</Text> →{" "}
          <Text style={styles.to}>{req.proposed[f.key]}</Text>
        </Text>
      ))}
      <Text style={styles.meta}>
        {req.proposed_by} — “{req.reason}”
      </Text>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  section: {
    color: colors.textMuted,
    fontSize: font.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  empty: { color: colors.textMuted, fontSize: font.sm },
  player: { color: colors.gold, fontSize: font.base, fontWeight: "800" },
  change: { color: colors.text, fontSize: font.sm },
  from: { color: colors.textMuted },
  to: { color: colors.gold, fontWeight: "800" },
  meta: { color: colors.textMuted, fontSize: font.xs },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
});

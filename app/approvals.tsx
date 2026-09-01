import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";

import { ApiError } from "@/src/api/client";
import { Badge, Button, Card, ErrorState, Loading } from "@/src/components/ui";
import { useApprovals, useApprovePlayer } from "@/src/hooks/queries";
import { colors, font, spacing } from "@/src/theme";

export default function ApprovalsScreen() {
  const query = useApprovals();
  const approve = useApprovePlayer();
  const pending = query.data ?? [];

  return (
    <>
      <Stack.Screen options={{ title: "Player approvals" }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {query.isLoading ? (
          <Loading label="Loading…" />
        ) : query.isError ? (
          <ErrorState
            message={query.error instanceof ApiError ? query.error.detail : "Couldn't load."}
            onRetry={() => query.refetch()}
          />
        ) : pending.length === 0 ? (
          <Text style={styles.empty}>No players waiting for approval.</Text>
        ) : (
          pending.map((p) => (
            <Card key={p.profile_id}>
              <View style={styles.row}>
                <Text style={styles.name}>{p.name}</Text>
                {!p.account_ready ? <Badge text="SETUP INCOMPLETE" tone="caution" /> : null}
              </View>
              {p.email ? <Text style={styles.meta}>{p.email}</Text> : null}
              {p.sponsor ? <Text style={styles.meta}>Sponsored by {p.sponsor}</Text> : null}
              <Button
                label={p.account_ready ? "Approve" : "Waiting on the player"}
                onPress={() =>
                  approve.mutate(p.profile_id, {
                    onError: (e) =>
                      Alert.alert(
                        "Couldn't approve",
                        e instanceof ApiError ? e.detail : "Try again.",
                      ),
                  })
                }
                loading={approve.isPending}
                disabled={!p.account_ready}
              />
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
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  name: { color: colors.text, fontSize: font.base, fontWeight: "700" },
  meta: { color: colors.textMuted, fontSize: font.sm },
});

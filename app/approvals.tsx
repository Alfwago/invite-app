import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";

import { ApiError } from "@/src/api/client";
import { Badge, Button, Card, ErrorState, Loading } from "@/src/components/ui";
import {
  useApprovals,
  useApprovePlayer,
  useDecideNameChange,
  useDecideUsernameChange,
  useNameChangeApprovals,
  useUsernameChangeApprovals,
} from "@/src/hooks/queries";
import { colors, font, spacing } from "@/src/theme";

export default function ApprovalsScreen() {
  const query = useApprovals();
  const approve = useApprovePlayer();
  const pending = query.data ?? [];

  const nameQuery = useNameChangeApprovals();
  const decideName = useDecideNameChange();
  const pendingNames = nameQuery.data ?? [];

  const usernameQuery = useUsernameChangeApprovals();
  const decideUsername = useDecideUsernameChange();
  const pendingUsernames = usernameQuery.data ?? [];

  return (
    <>
      <Stack.Screen options={{ title: "Player approvals" }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.sectionHeading}>New accounts</Text>
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

        <Text style={styles.sectionHeading}>Name changes</Text>
        {nameQuery.isLoading ? (
          <Loading label="Loading…" />
        ) : nameQuery.isError ? (
          <ErrorState
            message={nameQuery.error instanceof ApiError ? nameQuery.error.detail : "Couldn't load."}
            onRetry={() => nameQuery.refetch()}
          />
        ) : pendingNames.length === 0 ? (
          <Text style={styles.empty}>No name changes waiting for approval.</Text>
        ) : (
          pendingNames.map((r) => (
            <Card key={r.id}>
              <Text style={styles.name}>{r.name}</Text>
              <Text style={styles.meta}>
                {r.current_first_name} {r.current_last_name} → {r.proposed_first_name}{" "}
                {r.proposed_last_name}
              </Text>
              <View style={styles.row}>
                <Button
                  label="Approve"
                  onPress={() =>
                    decideName.mutate(
                      { requestId: r.id, decision: "APPROVED" },
                      {
                        onError: (e) =>
                          Alert.alert(
                            "Couldn't approve",
                            e instanceof ApiError ? e.detail : "Try again.",
                          ),
                      },
                    )
                  }
                  loading={decideName.isPending}
                />
                <Button
                  label="Decline"
                  variant="secondary"
                  onPress={() =>
                    decideName.mutate(
                      { requestId: r.id, decision: "DECLINED" },
                      {
                        onError: (e) =>
                          Alert.alert(
                            "Couldn't decline",
                            e instanceof ApiError ? e.detail : "Try again.",
                          ),
                      },
                    )
                  }
                  loading={decideName.isPending}
                />
              </View>
            </Card>
          ))
        )}

        <Text style={styles.sectionHeading}>Username changes</Text>
        {usernameQuery.isLoading ? (
          <Loading label="Loading…" />
        ) : usernameQuery.isError ? (
          <ErrorState
            message={
              usernameQuery.error instanceof ApiError ? usernameQuery.error.detail : "Couldn't load."
            }
            onRetry={() => usernameQuery.refetch()}
          />
        ) : pendingUsernames.length === 0 ? (
          <Text style={styles.empty}>No username changes waiting for approval.</Text>
        ) : (
          pendingUsernames.map((r) => (
            <Card key={r.id}>
              <Text style={styles.name}>{r.name}</Text>
              <Text style={styles.meta}>
                {r.current_username} → {r.proposed_username}
              </Text>
              <View style={styles.row}>
                {(["APPROVED", "DECLINED"] as const).map((decision) => (
                  <Button
                    key={decision}
                    label={decision === "APPROVED" ? "Approve" : "Decline"}
                    variant={decision === "APPROVED" ? undefined : "secondary"}
                    onPress={() =>
                      decideUsername.mutate(
                        { requestId: r.id, decision },
                        {
                          onError: (e) =>
                            Alert.alert(
                              decision === "APPROVED" ? "Couldn't approve" : "Couldn't decline",
                              e instanceof ApiError ? e.detail : "Try again.",
                            ),
                        },
                      )
                    }
                    loading={decideUsername.isPending}
                  />
                ))}
              </View>
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
  sectionHeading: {
    color: colors.gold,
    fontSize: font.md,
    fontWeight: "800",
    marginTop: spacing.sm,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  name: { color: colors.text, fontSize: font.base, fontWeight: "700" },
  meta: { color: colors.textMuted, fontSize: font.sm },
});

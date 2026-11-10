import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ApiError } from "@/src/api/client";
import type { PendingApproval } from "@/src/api/types";
import { groupBySponsor } from "@/src/approvalGroups";
import { useAuth } from "@/src/auth/AuthContext";
import { Tap } from "@/src/components/Tap";
import { Badge, Button, Card, ErrorState, Loading } from "@/src/components/ui";
import { SiteInviteCard } from "@/src/components/SiteInviteCard";
import {
  useApprovals,
  useApprovePlayer,
  useResendSiteInvite,
  useSiteInviteOptions,
  useDecideNameChange,
  useDecideUsernameChange,
  useNameChangeApprovals,
  useUsernameChangeApprovals,
} from "@/src/hooks/queries";
import { formatDateTime } from "@/src/format";
import { colors, font, spacing } from "@/src/theme";

export default function ApprovalsScreen() {
  const query = useApprovals();
  const approve = useApprovePlayer();
  const resend = useResendSiteInvite();
  const pending = query.data ?? [];
  const { me } = useAuth();
  // Groups the director opened or closed; by default yours (or the only one) is open.
  const [toggled, setToggled] = useState<Set<string>>(new Set());
  // null = server without site invites (pre-0.33): no invite form.
  const inviteOptions = useSiteInviteOptions();

  const nameQuery = useNameChangeApprovals();
  const decideName = useDecideNameChange();
  const pendingNames = nameQuery.data ?? [];

  const usernameQuery = useUsernameChangeApprovals();
  const decideUsername = useDecideUsernameChange();
  const pendingUsernames = usernameQuery.data ?? [];

  return (
    <>
      <Stack.Screen options={{ title: "Invites & approvals" }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {inviteOptions.data ? (
          <>
            <Text style={styles.sectionHeading}>Invite</Text>
            <SiteInviteCard options={inviteOptions.data} />
          </>
        ) : null}

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
          groupBySponsor(pending, me?.id).map((g, _i, all) => {
            const open = (g.mine || all.length === 1) !== toggled.has(g.key);
            return (
              <View key={g.key} style={styles.group}>
                <Tap
                  feedback="row"
                  onPress={() =>
                    setToggled((prev) => {
                      const next = new Set(prev);
                      if (next.has(g.key)) next.delete(g.key);
                      else next.add(g.key);
                      return next;
                    })
                  }
                  style={styles.groupHead}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                >
                  <Ionicons name={open ? "chevron-down" : "chevron-forward"} size={16} color={colors.textMuted} />
                  <Text style={styles.groupName}>
                    {g.director}
                    {g.mine ? " (you)" : ""}
                  </Text>
                  <Badge text={String(g.items.length)} tone="gold" />
                </Tap>
                {open
                  ? g.items.map((p) => (
                      <PendingCard key={p.profile_id} p={p} approve={approve} resend={resend} />
                    ))
                  : null}
              </View>
            );
          })
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

/** One player waiting for approval: their details, and Approve / Resend invite. */
function PendingCard({
  p,
  approve,
  resend,
}: {
  p: PendingApproval;
  approve: ReturnType<typeof useApprovePlayer>;
  resend: ReturnType<typeof useResendSiteInvite>;
}) {
  return (
    <Card>
      <View style={styles.row}>
        <Text style={styles.name}>{p.name}</Text>
        {!p.account_ready ? <Badge text="SETUP INCOMPLETE" tone="caution" /> : null}
      </View>
      {p.email ? <Text style={styles.meta}>{p.email}</Text> : null}
      {!p.account_ready && p.invite_expires_at ? (
        // Unfinished site invites are deleted after 30 days (server 0.40.5).
        <Text style={styles.meta}>
          Invite expires {formatDateTime(p.invite_expires_at)}. The account is deleted unless they finish
          setup or you resend it.
        </Text>
      ) : null}
      {!p.account_ready && p.can_resend ? (
        <Button
          label="Resend invite"
          variant="secondary"
          labelColor={colors.gold}
          onPress={() =>
            resend.mutate(p.profile_id, {
              onSuccess: (data) =>
                Alert.alert(data.sent ? "Invite resent" : "Already sent", data.detail),
              onError: (e) =>
                Alert.alert(
                  "Couldn't resend",
                  e instanceof ApiError ? e.detail : "Try again.",
                ),
            })
          }
          loading={resend.isPending && resend.variables === p.profile_id}
        />
      ) : (
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
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  groupHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xs },
  groupName: { color: colors.text, fontSize: font.base, fontWeight: "700", flexShrink: 1 },
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

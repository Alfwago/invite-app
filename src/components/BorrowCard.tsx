import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ApiError } from "@/src/api/client";
import type { EventDetail } from "@/src/api/types";
import {
  candidateA11yLabel,
  confirmCopy,
  emptyText,
  groupCandidates,
  roleMark,
  successText,
  type BorrowCandidate,
  visibleCandidates,
  type BorrowRole,
} from "@/src/borrow";
import { Button, ErrorState, Loading } from "@/src/components/ui";
import { useBorrowCandidates, useRosterAction } from "@/src/hooks/queries";
import { colors, font, radius, spacing } from "@/src/theme";

/**
 * "Borrow a Goalie or Skater" on the Manage → Roster tab, above "Add a
 * walk-on". Only rendered when the server says borrowing is possible
 * (`manage.can_borrow`, server 0.33+ — an older server never sends it).
 *
 * Goalie/Skater first (that choice is the player's slot, so no separate
 * Goalie-or-Skater prompt), then search, then one tap per player → confirm
 * → add + notify. One player at a time. Goalie lists every goalie at once;
 * Skater lists nobody until 2+ letters are typed (see `needsSearch`).
 */
export function BorrowCard({ event, busy }: { event: EventDetail; busy: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={styles.subhead}>Borrow a Goalie or Skater</Text>
      <Text style={styles.muted}>From another skate group, for this skate only. They&apos;re notified.</Text>
      <Button
        label={open ? "Close" : "Choose a player"}
        variant="secondary"
        onPress={() => setOpen((o) => !o)}
      />
      {open ? <BorrowPicker event={event} busy={busy} /> : null}
    </View>
  );
}

function BorrowPicker({ event, busy }: { event: EventDetail; busy: boolean }) {
  const panel = useBorrowCandidates(event.id);
  const roster = useRosterAction(event.id);
  const [role, setRole] = useState<BorrowRole | null>(null);
  const [query, setQuery] = useState("");

  if (panel.isLoading) return <Loading label="Loading players…" />;
  if (panel.isError || !panel.data) {
    return (
      <ErrorState
        message={panel.error instanceof ApiError ? panel.error.detail : "Couldn't load players from other skate groups."}
        onRetry={() => panel.refetch()}
      />
    );
  }
  const data = panel.data;
  if (!data.available) return <Text style={styles.muted}>{data.reason}</Text>;

  const current: BorrowRole = role ?? data.default_role ?? "skater";
  const rows = visibleCandidates(data.players, current, query);
  const empty = emptyText(data.players, current, query);

  async function add(p: BorrowCandidate) {
    // Re-read the counts first: the "already full" line must reflect the
    // roster now, not when the list was opened.
    const latest = (await panel.refetch()).data ?? data;
    if (!latest.available) {
      Alert.alert(`Couldn't add ${p.name}`, latest.reason);
      return;
    }
    const copy = confirmCopy(p, current, latest);
    Alert.alert(copy.title, copy.body, [
      { text: "Cancel", style: "cancel" },
      {
        text: copy.button,
        onPress: () =>
          roster.mutate(
            { action: "borrow", player_id: p.id, role: current },
            {
              onSuccess: (fresh) => {
                const r = fresh.borrow_result ?? { name: p.name, role: current, pushed: true };
                Alert.alert(successText(r));
              },
              onError: (e) =>
                Alert.alert(
                  `Couldn't add ${p.name}`,
                  e instanceof ApiError ? e.detail : "Try again in a moment.",
                ),
            },
          ),
      },
    ]);
  }

  return (
    <View style={styles.panel}>
      <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel="Borrow a">
        {(["goalie", "skater"] as const).map((r) => {
          const on = current === r;
          return (
            <Pressable
              key={r}
              onPress={() => setRole(r)}
              style={[styles.segmentItem, on && styles.segmentOn]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, checked: on }}
              accessibilityLabel={r === "goalie" ? "Goalie" : "Skater"}
            >
              <Text style={[styles.segmentText, on && styles.segmentTextOn]}>
                {r === "goalie" ? "Goalie" : "Skater"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name"
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        autoCapitalize="words"
        accessibilityLabel="Search by name"
      />
      {empty ? (
        <Text style={styles.muted} accessibilityLiveRegion="polite">
          {empty}
        </Text>
      ) : (
        groupCandidates(rows).map((g) => (
          <View key={g.night} style={styles.group}>
            <Text style={styles.groupHead} accessibilityRole="header">
              {g.night}
            </Text>
            {g.players.map((p) => {
              const mark = roleMark(p);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => void add(p)}
                  disabled={busy || roster.isPending}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={candidateA11yLabel(p)}
                  accessibilityHint="Asks before adding them to this skate"
                >
                  <Text style={styles.name} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {mark ? <Text style={styles.goldTag}>{mark}</Text> : null}
                  <Text style={styles.groups} numberOfLines={1}>
                    {p.home_label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  subhead: {
    color: colors.textMuted,
    fontSize: font.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  muted: { color: colors.textMuted },
  panel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  segment: { flexDirection: "row", gap: spacing.sm },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardRaised,
    alignItems: "center",
  },
  segmentOn: { borderColor: colors.gold, backgroundColor: colors.gold },
  segmentText: { color: colors.textMuted, fontSize: font.sm, fontWeight: "700" },
  segmentTextOn: { color: colors.goldText },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  group: { gap: 2 },
  groupHead: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: { opacity: 0.6 },
  // The name wins the space; the (possibly long) group list truncates.
  name: { color: colors.text, fontSize: font.sm, flexShrink: 0, maxWidth: "60%" },
  goldTag: { color: colors.gold, fontSize: 15, fontWeight: "900" },
  groups: { color: colors.textMuted, fontSize: font.xs, marginLeft: "auto", flexShrink: 1, textAlign: "right" },
});

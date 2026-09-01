import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";

import { ApiError } from "@/src/api/client";
import type { PlayerNightRow, SkillRatings } from "@/src/api/types";
import { RatingRadar } from "@/src/components/RatingRadar";
import { Badge, Button, Card, ErrorState, Loading } from "@/src/components/ui";
import { usePlayer, useSaveRatings } from "@/src/hooks/queries";
import { colors, font, radius, spacing } from "@/src/theme";

type RatingKey = "hockey_sense" | "skating" | "defense" | "offense" | "goalie";
const KEYS: { key: RatingKey; label: string; max: number }[] = [
  { key: "hockey_sense", label: "Hockey sense", max: 5 },
  { key: "skating", label: "Skating", max: 5 },
  { key: "defense", label: "Defense", max: 5 },
  { key: "offense", label: "Offense", max: 5 },
  { key: "goalie", label: "Goalie", max: 3 },
];

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const playerId = Number(id);
  const query = usePlayer(playerId);
  const save = useSaveRatings(playerId);

  const player = query.data;
  const [nightId, setNightId] = useState<number | null>(null);
  const selectedNight: PlayerNightRow | undefined = useMemo(
    () => player?.nights.find((n) => n.id === nightId),
    [player, nightId],
  );

  const baseRatings = selectedNight ? selectedNight.ratings : player?.global_ratings;
  const [draft, setDraft] = useState<Record<RatingKey, number>>({
    hockey_sense: 0,
    skating: 0,
    defense: 0,
    offense: 0,
    goalie: 0,
  });
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (baseRatings) {
      setDraft({
        hockey_sense: baseRatings.hockey_sense,
        skating: baseRatings.skating,
        defense: baseRatings.defense,
        offense: baseRatings.offense,
        goalie: baseRatings.goalie,
      });
      setEditing(false);
      setReason("");
    }
  }, [baseRatings, nightId]);

  if (query.isLoading) return <Loading label="Loading player…" />;
  if (query.isError || !player) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.detail : "Couldn't load this player."}
        onRetry={() => query.refetch()}
      />
    );
  }

  const m = player.metrics;
  const canManage = !!selectedNight?.can_manage;
  const canEditDirect = !!selectedNight?.can_edit;
  const pending = selectedNight?.pending_request ?? null;
  const dirty = KEYS.some(({ key }) => draft[key] !== (baseRatings?.[key] ?? 0));
  const ppv = round2(0.4 * draft.hockey_sense + 0.25 * draft.skating + 0.2 * draft.defense + 0.15 * draft.offense);

  function step(key: RatingKey, delta: number, max: number) {
    setDraft((d) => ({ ...d, [key]: clamp(round2(d[key] + delta), 0, max) }));
  }

  async function onSave() {
    if (!selectedNight) return;
    try {
      await save.mutateAsync({
        night_id: selectedNight.id,
        ...draft,
        reason: reason.trim() || undefined,
      });
      setEditing(false);
      Alert.alert(
        canEditDirect ? "Ratings saved" : "Change proposed",
        canEditDirect
          ? `${selectedNight.name} ratings updated.`
          : "Another director for this night can now approve it.",
      );
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof ApiError ? e.detail : "Try again.");
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: player.name }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.headerRow}>
            <Text style={styles.name}>{player.name}</Text>
            {player.is_goalie ? <Badge text="GOALIE" tone="goalie" /> : null}
          </View>
          <Text style={styles.sub}>
            {player.profile_id || "—"}
            {player.years_in_obh != null ? ` · ${player.years_in_obh} yr${player.years_in_obh === 1 ? "" : "s"} in OBH` : ""}
            {player.skill_assessment ? ` · ${player.skill_assessment}` : ""}
          </Text>
        </Card>

        <View style={styles.tiles}>
          <Tile value={m.invited_count} label="Invites" />
          <Tile value={m.yes_count} label="Yes RSVPs" />
          <Tile
            value={m.attendance_pct != null ? `${m.attendance_pct}%` : "—"}
            label="Attendance"
          />
          <Tile value={m.beer_guy_count} label="Beer Guy" />
          <Tile value={m.whiskey_guy_count} label="Whiskey Guy" />
          <Tile value={m.present_count} label="Skated" />
        </View>

        <Card>
          <Text style={styles.cardLabel}>Ratings</Text>
          <View style={styles.nightChips}>
            <NightChip label="Global" active={nightId === null} onPress={() => setNightId(null)} />
            {player.nights.map((n) => (
              <NightChip
                key={n.id}
                label={n.name}
                active={nightId === n.id}
                badge={n.rating_source === "night"}
                onPress={() => setNightId(n.id)}
              />
            ))}
          </View>

          {baseRatings ? (
            <RatingRadar values={draft} />
          ) : null}
          <Text style={styles.ppvLine}>
            PPV <Text style={styles.ppvValue}>{ppv.toFixed(2)}</Text>
            {nightId === null ? "  ·  global (per-night editing only)" : ""}
          </Text>

          {pending ? (
            <View style={styles.pendingBanner}>
              <Text style={styles.pendingTitle}>Change pending approval</Text>
              <Text style={styles.pendingBody}>
                {KEYS.filter((k) => pending.current[k.key] !== pending.proposed[k.key])
                  .map((k) => `${k.label} ${pending.current[k.key]}→${pending.proposed[k.key]}`)
                  .join(", ")}
              </Text>
              <Text style={styles.pendingMeta}>by {pending.proposed_by} — “{pending.reason}”</Text>
            </View>
          ) : null}

          {KEYS.map(({ key, label, max }) => (
            <View key={key} style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>{label}</Text>
              {editing ? (
                <View style={styles.stepper}>
                  <Pressable style={styles.stepBtn} onPress={() => step(key, -0.25, max)} hitSlop={6}>
                    <Text style={styles.stepText}>−</Text>
                  </Pressable>
                  <Text style={styles.ratingValue}>{draft[key].toFixed(2)}</Text>
                  <Pressable style={styles.stepBtn} onPress={() => step(key, 0.25, max)} hitSlop={6}>
                    <Text style={styles.stepText}>+</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.barWrap}>
                  <View style={[styles.bar, { width: `${(draft[key] / max) * 100}%` }]} />
                  <Text style={styles.barValue}>{draft[key].toFixed(2)}</Text>
                </View>
              )}
            </View>
          ))}

          {nightId !== null && canManage ? (
            editing ? (
              <>
                {!canEditDirect ? (
                  <TextInput
                    style={styles.reason}
                    placeholder="Reason for the change (required)"
                    placeholderTextColor={colors.textMuted}
                    value={reason}
                    onChangeText={setReason}
                    multiline
                  />
                ) : null}
                <View style={styles.actionRow}>
                  <Button
                    label={canEditDirect ? "Save ratings" : "Propose change"}
                    onPress={onSave}
                    loading={save.isPending}
                    disabled={!dirty || (!canEditDirect && !reason.trim())}
                  />
                  <Button
                    label="Cancel"
                    variant="secondary"
                    onPress={() => {
                      setEditing(false);
                      setReason("");
                      if (baseRatings) {
                        setDraft({
                          hockey_sense: baseRatings.hockey_sense,
                          skating: baseRatings.skating,
                          defense: baseRatings.defense,
                          offense: baseRatings.offense,
                          goalie: baseRatings.goalie,
                        });
                      }
                    }}
                  />
                </View>
              </>
            ) : (
              <Button
                label={canEditDirect ? "Edit ratings" : "Propose a change"}
                variant="secondary"
                onPress={() => setEditing(true)}
              />
            )
          ) : null}
        </Card>
      </ScrollView>
    </>
  );
}

function Tile({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function NightChip({
  label,
  active,
  badge,
  onPress,
}: {
  label: string;
  active: boolean;
  badge?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.nightChip, active && styles.nightChipOn]}>
      <Text style={[styles.nightChipText, active && styles.nightChipTextOn]}>
        {label}
        {badge ? " ●" : ""}
      </Text>
    </Pressable>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { color: colors.text, fontSize: font.lg, fontWeight: "800", flexShrink: 1 },
  sub: { color: colors.textMuted, fontSize: font.sm },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: {
    flexGrow: 1,
    flexBasis: "30%",
    backgroundColor: colors.cardRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  tileValue: { color: colors.text, fontSize: font.md, fontWeight: "800" },
  tileLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  cardLabel: { color: colors.text, fontSize: 16, fontWeight: "700" },
  nightChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  nightChip: {
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardRaised,
  },
  nightChipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  nightChipText: { color: colors.textMuted, fontSize: font.xs, fontWeight: "700" },
  nightChipTextOn: { color: colors.goldText },
  ppvLine: { color: colors.textMuted, fontSize: font.sm, textAlign: "center" },
  ppvValue: { color: colors.gold, fontWeight: "800" },
  pendingBanner: {
    borderWidth: 1,
    borderColor: colors.amber,
    backgroundColor: colors.amberDim,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  pendingTitle: { color: colors.amber, fontSize: font.xs, fontWeight: "800", textTransform: "uppercase" },
  pendingBody: { color: colors.text, fontSize: font.sm },
  pendingMeta: { color: colors.textMuted, fontSize: font.xs },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  ratingLabel: { color: colors.text, fontSize: font.sm, width: 96 },
  barWrap: {
    flex: 1,
    height: 22,
    backgroundColor: colors.cardRaised,
    borderRadius: radius.sm,
    justifyContent: "center",
    overflow: "hidden",
  },
  bar: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: colors.goldDim, borderRightWidth: 2, borderRightColor: colors.gold },
  barValue: {
    color: colors.text,
    fontSize: font.xs,
    fontWeight: "700",
    textAlign: "right",
    paddingRight: spacing.sm,
    fontVariant: ["tabular-nums"],
  },
  stepper: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: spacing.md },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { color: colors.text, fontSize: 18, fontWeight: "800" },
  ratingValue: {
    color: colors.text,
    fontSize: font.base,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    minWidth: 48,
    textAlign: "center",
  },
  reason: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    color: colors.text,
    padding: spacing.md,
    fontSize: 15,
    minHeight: 60,
  },
  actionRow: { gap: spacing.sm },
});

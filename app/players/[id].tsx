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
import Slider from "@react-native-community/slider";

import { ApiError } from "@/src/api/client";
import type { GlobalScore, PlayerDetail, PlayerNightRow } from "@/src/api/types";
import { RatingRadar } from "@/src/components/RatingRadar";
import { Badge, Button, Card, ErrorState, Loading } from "@/src/components/ui";
import { usePlayer, useSaveRatings } from "@/src/hooks/queries";
import { formatScore, obhGrade } from "@/src/ratings";
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
  const [texts, setTexts] = useState<Record<RatingKey, string>>({
    hockey_sense: "0",
    skating: "0",
    defense: "0",
    offense: "0",
    goalie: "0",
  });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (baseRatings) {
      const next = {
        hockey_sense: baseRatings.hockey_sense,
        skating: baseRatings.skating,
        defense: baseRatings.defense,
        offense: baseRatings.offense,
        goalie: baseRatings.goalie,
      };
      setDraft(next);
      setTexts({
        hockey_sense: next.hockey_sense.toFixed(2),
        skating: next.skating.toFixed(2),
        defense: next.defense.toFixed(2),
        offense: next.offense.toFixed(2),
        goalie: next.goalie.toFixed(2),
      });
      setEditing(false);
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
  const canEdit = !!selectedNight?.can_edit;
  const dirty = KEYS.some(({ key }) => draft[key] !== (baseRatings?.[key] ?? 0));
  const ppv = round2(0.4 * draft.hockey_sense + 0.25 * draft.skating + 0.2 * draft.defense + 0.15 * draft.offense);

  function setRating(key: RatingKey, value: number, max: number) {
    const v = clamp(round2(value), 0, max);
    setDraft((d) => ({ ...d, [key]: v }));
    setTexts((t) => ({ ...t, [key]: v.toFixed(2) }));
  }

  function onTypeRating(key: RatingKey, raw: string, max: number) {
    setTexts((t) => ({ ...t, [key]: raw }));
    const n = parseFloat(raw);
    if (Number.isFinite(n)) {
      setDraft((d) => ({ ...d, [key]: clamp(n, 0, max) }));
    }
  }

  function onBlurRating(key: RatingKey) {
    setTexts((t) => ({ ...t, [key]: draft[key].toFixed(2) }));
  }

  async function onSave() {
    if (!selectedNight) return;
    try {
      await save.mutateAsync({ night_id: selectedNight.id, ...draft });
      setEditing(false);
      Alert.alert("Ratings saved", `${selectedNight.name} ratings updated.`);
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
            <NightChip label="Global Score" active={nightId === null} onPress={() => setNightId(null)} />
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

          {nightId === null ? (
            <GlobalScoreBlock player={player} />
          ) : (
          <>
          {baseRatings ? (
            <RatingRadar values={draft} />
          ) : null}
          <Text style={styles.ppvLine}>
            {selectedNight?.name} PPV{" "}
            <Text style={[styles.ppvValue, !(ppv > 0) && styles.notRated]}>{formatScore(ppv)}</Text>
            {ppv > 0 ? `  ·  ${obhGrade(ppv)}` : ""}
          </Text>

          {KEYS.map(({ key, label, max }) =>
            editing ? (
              <View key={key} style={styles.editRow}>
                <View style={styles.editHead}>
                  <Text style={styles.ratingLabel}>{label}</Text>
                  <TextInput
                    style={styles.valueInput}
                    value={texts[key]}
                    onChangeText={(t) => onTypeRating(key, t, max)}
                    onBlur={() => onBlurRating(key)}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    maxLength={4}
                  />
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={max}
                  step={0.05}
                  value={draft[key]}
                  onValueChange={(v) => setRating(key, v, max)}
                  minimumTrackTintColor={colors.gold}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.gold}
                />
              </View>
            ) : (
              <View key={key} style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>{label}</Text>
                <View style={styles.barWrap}>
                  <View style={[styles.bar, { width: `${(draft[key] / max) * 100}%` }]} />
                  <Text style={styles.barValue}>{draft[key].toFixed(2)}</Text>
                </View>
              </View>
            ),
          )}

          {nightId !== null && canEdit ? (
            editing ? (
              <View style={styles.actionRow}>
                <Button
                  label="Save ratings"
                  onPress={onSave}
                  loading={save.isPending}
                  disabled={!dirty}
                />
                <Button
                  label="Cancel"
                  variant="secondary"
                  onPress={() => {
                    setEditing(false);
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
            ) : (
              <Button
                label={ppv > 0 ? "Edit ratings" : "Rate this player"}
                variant="secondary"
                onPress={() => setEditing(true)}
              />
            )
          ) : null}
          </>
          )}
        </Card>
      </ScrollView>
    </>
  );
}

/** Global Score (and Global Goalie Score for goalies): the number, its OBH
 *  grade, and which nights it came from — or Not Rated. */
function GlobalScoreBlock({ player }: { player: PlayerDetail }) {
  const rows: { label: string; score: GlobalScore; grade: boolean; fallback: string }[] = [
    { label: "Global Score", score: player.global_score, grade: true, fallback: "3.00" },
  ];
  if (player.global_goalie_score) {
    rows.push({ label: "Global Goalie Score", score: player.global_goalie_score, grade: false, fallback: "2.00" });
  }
  return (
    <View style={styles.globalBlock}>
      {rows.map(({ label, score, grade, fallback }) => (
        <View key={label} style={styles.globalRow}>
          <Text style={styles.globalLabel}>{label}</Text>
          <Text style={[styles.globalValue, score.score == null && styles.notRated]}>
            {formatScore(score.score)}
            {grade && score.score != null ? <Text style={styles.globalGrade}>{`  ${obhGrade(score.score)}`}</Text> : null}
          </Text>
          <Text style={styles.globalDetail}>
            {score.score == null
              ? `No rated nights yet — pick a night above to rate them. Teams count them as ${fallback}.`
              : `${score.rule[0].toUpperCase()}${score.rule.slice(1)}: ${score.nights
                  .map((n) => `${n.name} ${n.value.toFixed(2)}`)
                  .join(" · ")}`}
          </Text>
        </View>
      ))}
    </View>
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
  globalBlock: { gap: spacing.md, paddingVertical: spacing.sm },
  globalRow: { alignItems: "center", gap: 2 },
  globalLabel: { color: colors.textMuted, fontSize: font.sm, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  globalValue: { color: colors.gold, fontSize: font.xl, fontWeight: "800" },
  globalGrade: { color: colors.text, fontSize: font.base, fontWeight: "700" },
  globalDetail: { color: colors.textMuted, fontSize: font.sm, textAlign: "center" },
  notRated: { color: colors.textMuted, fontWeight: "600" },
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
  editRow: { gap: 2, paddingVertical: spacing.xs },
  editHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  valueInput: {
    color: colors.gold,
    fontSize: font.base,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.cardRaised,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    minWidth: 60,
    textAlign: "center",
  },
  slider: { width: "100%", height: 36 },
  actionRow: { gap: spacing.sm },
});

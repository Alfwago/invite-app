import { useState, type ComponentType } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { ApiError } from "@/src/api/client";
import type { MeMetrics } from "@/src/api/types";
import { Tap } from "@/src/components/Tap";
import { colors, font, radius, spacing } from "@/src/theme";

type TileProps = { value: string | number; label: string };

/**
 * The primary night's attendance, above the all-nights tiles (1.8.1, server
 * 0.40.5, owner 2026-11-10): many players skate more than one night but one
 * most. Chips pick it — "Most invited" goes back to the server's default.
 * Renders nothing on an older server (no `primary_night` in the metrics).
 */
export function PrimaryNightMetrics({
  metrics,
  choices,
  onPick,
  Tile,
  tileRow,
}: {
  metrics: MeMetrics;
  choices: { id: number; name: string }[];
  onPick: (nightId: number | null) => Promise<unknown>;
  Tile: ComponentType<TileProps>;
  tileRow?: object;
}) {
  const [saving, setSaving] = useState(false);
  const night = metrics.primary_night;
  const p = metrics.primary;
  if (night === undefined) return null;

  async function pick(id: number | null) {
    if (saving) return;
    setSaving(true);
    try {
      await onPick(id);
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof ApiError ? e.detail : "Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.wrap}>
      {night && p ? (
        <>
          <View style={styles.head}>
            <Text style={styles.night}>{night.name}</Text>
            <Text style={styles.note}>{night.chosen ? "Primary night" : "Primary night · invited most"}</Text>
          </View>
          <View style={tileRow}>
            <Tile value={p.invited_count} label="Invites" />
            <Tile value={p.yes_count} label="Yes RSVPs" />
            <Tile value={p.attendance_pct != null ? `${p.attendance_pct}%` : "—"} label="Attendance" />
          </View>
        </>
      ) : null}
      {choices.length > 0 ? (
        <View style={styles.chips} accessibilityLabel="Primary night">
          <Chip label="Most invited" on={!night?.chosen} onPress={() => pick(null)} />
          {choices.map((c) => (
            <Chip key={c.id} label={c.name} on={!!night?.chosen && night.id === c.id} onPress={() => pick(c.id)} />
          ))}
        </View>
      ) : null}
      <Text style={styles.allNights}>All nights</Text>
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={[styles.chip, on && styles.chipOn]}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  head: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, flexWrap: "wrap" },
  night: { color: colors.text, fontSize: font.md, fontWeight: "800" },
  note: { color: colors.textMuted, fontSize: font.xs },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.textMuted, fontSize: font.xs, fontWeight: "700" },
  chipTextOn: { color: colors.goldText },
  allNights: { color: colors.textMuted, fontSize: font.xs, fontWeight: "700", marginTop: spacing.xs },
});

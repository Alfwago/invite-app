import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ApiError } from "@/src/api/client";
import { KeyboardAwareScrollView } from "@/src/components/KeyboardAwareScrollView";
import { ClockField, DateField, NumberField } from "@/src/components/pickers";
import type { Night } from "@/src/api/types";
import { Button, Card, ErrorState, Loading } from "@/src/components/ui";
import { formatEventDate, formatTime } from "@/src/format";
import { useCreateNextEvent, useNights } from "@/src/hooks/queries";
import { colors, radius, spacing } from "@/src/theme";

const CUSTOM = -1;

export default function NewEventScreen() {
  const router = useRouter();
  const nightsQuery = useNights();
  const create = useCreateNextEvent();

  const [nightId, setNightId] = useState<number | null>(null);
  const [date, setDate] = useState(""); // optional YYYY-MM-DD
  const [startTime, setStartTime] = useState(""); // optional HH:MM (24h)
  const [capacity, setCapacity] = useState(""); // optional roster limit
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(() => nightsQuery.data ?? [], [nightsQuery.data]);
  const selected = nightId != null;
  const night = nightId != null && nightId !== CUSTOM
    ? options.find((n) => n.id === nightId)
    : undefined;

  if (nightsQuery.isLoading) return <Loading label="Loading nights…" />;
  if (nightsQuery.isError) {
    return (
      <ErrorState
        message={
          nightsQuery.error instanceof ApiError ? nightsQuery.error.detail : "Couldn't load nights."
        }
        onRetry={() => nightsQuery.refetch()}
      />
    );
  }

  async function submit() {
    setError(null);
    if (date !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Date must be YYYY-MM-DD, or leave it blank for the next scheduled day.");
      return;
    }
    const time = startTime.trim();
    if (time !== "" && !/^\d{1,2}:\d{2}$/.test(time)) {
      setError("Pick a valid puck drop time, or leave it blank.");
      return;
    }
    const cap = capacity.trim();
    if (cap !== "" && !/^\d+$/.test(cap)) {
      setError("Roster limit must be a whole number, or leave it blank.");
      return;
    }
    try {
      const event = await create.mutateAsync({
        night_id: nightId === CUSTOM ? null : nightId,
        ...(date ? { base_date: date } : {}),
        ...(time ? { start_time: time } : {}),
        ...(cap ? { capacity: Number(cap) } : {}),
      });
      router.replace(`/event/${event.id}/manage`);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Couldn't create the event.");
    }
  }

  return (
    <KeyboardAwareScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.label}>Which skate?</Text>
        {options.map((n: Night) => (
          <NightOption
            key={n.id}
            label={n.name}
            active={nightId === n.id}
            onPress={() => setNightId(n.id)}
          />
        ))}
        <NightOption
          label="Custom event (no skate group)"
          active={nightId === CUSTOM}
          onPress={() => setNightId(CUSTOM)}
        />
      </Card>

      {night ? (
        <Card accent="public">
          <Text style={styles.label}>What you&apos;ll get</Text>
          <DefaultRow
            k="Date"
            v={night.next_default_date ? formatEventDate(night.next_default_date) : "today"}
          />
          <DefaultRow k="Puck drop" v={night.default_time ? formatTime(night.default_time) : "—"} />
          <DefaultRow k="Location" v={night.default_location || "—"} />
          <DefaultRow
            k="Roster limit"
            v={night.default_capacity != null ? String(night.default_capacity) : "—"}
          />
          <DefaultRow
            k="Goalies needed"
            v={night.default_goalies_needed != null ? String(night.default_goalies_needed) : "—"}
          />
          {night.default_preset ? (
            <DefaultRow k="Preset" v={`${night.default_preset.name} (applied)`} />
          ) : null}
          <Text style={styles.hint}>
            The director message, invite list and any default-preset roster come from this skate
            group too. Override the date/time/limit below if you need to.
          </Text>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.label}>Date</Text>
        <DateField
          value={date}
          onChange={setDate}
          minimumDate={new Date()}
          placeholder={
            night?.next_default_date
              ? `Default · ${formatEventDate(night.next_default_date)}`
              : "Default · today"
          }
        />

        <Text style={styles.label}>Puck drop</Text>
        <ClockField
          value={startTime}
          onChange={setStartTime}
          placeholder={
            night?.default_time
              ? `Default · ${formatTime(night.default_time)}`
              : "Choose a time"
          }
        />

        <Text style={styles.label}>Roster limit</Text>
        <NumberField
          value={capacity}
          onChange={setCapacity}
          min={4}
          max={60}
          placeholder={
            night?.default_capacity != null
              ? `Default · ${night.default_capacity} skaters`
              : "Night default"
          }
        />
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label="Create event"
        onPress={submit}
        disabled={!selected}
        loading={create.isPending}
      />
    </KeyboardAwareScrollView>
  );
}

function DefaultRow({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.defaultRow}>
      <Text style={styles.defaultKey}>{k}</Text>
      <Text style={styles.defaultVal} numberOfLines={1}>
        {v}
      </Text>
    </View>
  );
}

function NightOption({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, active && { borderColor: colors.gold, backgroundColor: colors.bg }]}
    >
      <View style={[styles.radio, active && { borderColor: colors.gold }]}>
        {active ? <View style={styles.radioDot} /> : null}
      </View>
      <Text style={styles.optionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  label: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  optionText: { color: colors.text, fontSize: 15, flexShrink: 1 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold },
  hint: { color: colors.textMuted, fontSize: 13 },
  error: { color: colors.red, fontWeight: "600" },
  defaultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 3,
  },
  defaultKey: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  defaultVal: { color: colors.text, fontSize: 14, flexShrink: 1, textAlign: "right" },
});

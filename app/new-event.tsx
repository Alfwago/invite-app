import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ApiError } from "@/src/api/client";
import type { Night } from "@/src/api/types";
import { Button, Card, ErrorState, Loading } from "@/src/components/ui";
import { useCreateNextEvent, useNights } from "@/src/hooks/queries";
import { colors, radius, spacing } from "@/src/theme";

const CUSTOM = -1;

export default function NewEventScreen() {
  const router = useRouter();
  const nightsQuery = useNights();
  const create = useCreateNextEvent();

  const [nightId, setNightId] = useState<number | null>(null);
  const [date, setDate] = useState(""); // optional YYYY-MM-DD
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(() => nightsQuery.data ?? [], [nightsQuery.data]);
  const selected = nightId != null;

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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) && date !== "") {
      setError("Date must be YYYY-MM-DD, or leave it blank for today.");
      return;
    }
    try {
      const event = await create.mutateAsync({
        night_id: nightId === CUSTOM ? null : nightId,
        ...(date ? { base_date: date } : {}),
      });
      router.replace(`/event/${event.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Couldn't create the event.");
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
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

      <Card>
        <Text style={styles.label}>Date (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD — blank = today"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          value={date}
          onChangeText={setDate}
        />
        <Text style={styles.hint}>
          Start time, roster limit and the invite list come from the skate group's defaults.
        </Text>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label="Create event"
        onPress={submit}
        disabled={!selected}
        loading={create.isPending}
      />
    </ScrollView>
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
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  hint: { color: colors.textMuted, fontSize: 13 },
  error: { color: colors.red, fontWeight: "600" },
});

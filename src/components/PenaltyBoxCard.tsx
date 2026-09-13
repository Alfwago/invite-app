import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { EventDetail, PlayerPenaltyEntry } from "@/src/api/types";
import { Card } from "@/src/components/ui";
import { useChirpOptions, useTaunts } from "@/src/hooks/queries";
import { colors, font, radius, spacing } from "@/src/theme";

function eligibleLabel(iso: string | null): string {
  if (!iso) return "until invites go out";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "now";
  const h = Math.round(ms / 3_600_000);
  if (h < 1) return "in under an hour";
  if (h < 48) return `in ~${h}h`;
  return `in ~${Math.round(h / 24)}d`;
}

/** Player-facing penalty box: who's boxed, when they're free, and chirps.
 *  "It's for fun on purpose." */
export function PenaltyBoxCard({ event }: { event: EventDetail }) {
  const entries = event.penalty_box;
  const mine = event.my_penalty;
  if (entries.length === 0 && !mine?.in_box) return null;

  return (
    <Card>
      <View style={styles.head}>
        <Ionicons name="snow-outline" size={18} color={colors.blue} />
        <Text style={styles.heading}>Penalty box</Text>
      </View>

      {mine?.in_box ? (
        <View style={styles.mineBanner}>
          <Text style={styles.mineText}>
            You&apos;re in the box for this skate — you can RSVP {eligibleLabel(mine.eligible_at)}.
          </Text>
        </View>
      ) : null}

      {entries.map((e) => (
        <PenaltyRow key={e.id} eventId={event.id} entry={e} />
      ))}
    </Card>
  );
}

function PenaltyRow({ eventId, entry }: { eventId: number | string; entry: PlayerPenaltyEntry }) {
  const { post, remove } = useTaunts(eventId);
  const chirps = useChirpOptions();
  const [draft, setDraft] = useState("");
  const busy = post.isPending || remove.isPending;

  function send(text: string, preset: boolean) {
    const t = text.trim();
    if (!t) return;
    post.mutate(
      { entryId: entry.id, text: t, preset },
      { onError: (err) => Alert.alert("Couldn't send", String((err as Error).message)) },
    );
    if (!preset) setDraft("");
  }

  return (
    <View style={styles.row}>
      <Text style={styles.name}>
        {entry.is_me ? "You" : entry.name}
        <Text style={styles.eligible}>  ·  free {eligibleLabel(entry.eligible_at)}</Text>
      </Text>
      {entry.reason ? <Text style={styles.reason}>{entry.reason}</Text> : null}

      {entry.taunts.map((t) => (
        <View key={t.id} style={styles.chirp}>
          <Text style={styles.chirpText}>
            <Text style={styles.chirpBy}>{t.mine ? "You" : t.author}: </Text>
            {t.text}
          </Text>
          {t.mine ? (
            <Pressable hitSlop={8} disabled={busy} onPress={() => remove.mutate(t.id)}>
              <Ionicons name="close" size={14} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ))}

      {entry.can_taunt ? (
        <>
          {chirps.data?.presets?.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetRow}>
              {chirps.data.presets.map((p) => (
                <Pressable key={p} style={styles.presetChip} disabled={busy} onPress={() => send(p, true)}>
                  <Text style={styles.presetChipText}>{p}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Chirp them…"
              placeholderTextColor={colors.textMuted}
              maxLength={200}
            />
            <Pressable
              style={[styles.sendBtn, (!draft.trim() || busy) && styles.sendOff]}
              disabled={!draft.trim() || busy}
              onPress={() => send(draft, false)}
            >
              <Ionicons name="arrow-up" size={18} color={colors.goldText} />
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm },
  heading: { color: colors.text, fontSize: font.md, fontWeight: "700" },
  mineBanner: {
    backgroundColor: colors.blueDim,
    borderColor: colors.blue,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  mineText: { color: colors.text, fontSize: font.sm },
  row: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    gap: 4,
  },
  name: { color: colors.text, fontWeight: "700", fontSize: font.sm },
  eligible: { color: colors.textMuted, fontWeight: "400" },
  reason: { color: colors.textMuted, fontSize: font.xs },
  chirp: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs },
  chirpText: { color: colors.text, fontSize: font.sm, flex: 1 },
  chirpBy: { color: colors.textMuted },
  presetRow: { marginTop: spacing.xs },
  presetChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginRight: spacing.xs,
  },
  presetChipText: { color: colors.textMuted, fontSize: font.xs },
  composer: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    color: colors.text,
    fontSize: font.sm,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  sendOff: { opacity: 0.4 },
});

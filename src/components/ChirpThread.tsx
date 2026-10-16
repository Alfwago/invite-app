import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { Taunt } from "@/src/api/types";
import { Tap } from "@/src/components/Tap";
import { colors, font, radius, spacing } from "@/src/theme";

/** One line's chirps + the composer (preset chips, free text). Shared by the
 *  Penalty Box and Late Scratches cards; the parent supplies the mutations. */
export function ChirpThread({
  taunts,
  canTaunt,
  presets,
  busy,
  onSend,
  onRemove,
}: {
  taunts: Taunt[];
  canTaunt: boolean;
  presets: string[] | undefined;
  busy: boolean;
  onSend: (text: string, preset: boolean, opts: { onError: (err: unknown) => void }) => void;
  onRemove: (tauntId: number) => void;
}) {
  const [draft, setDraft] = useState("");

  function send(text: string, preset: boolean) {
    const t = text.trim();
    if (!t) return;
    onSend(t, preset, {
      onError: (err) => Alert.alert("Couldn't send", String((err as Error).message)),
    });
    if (!preset) setDraft("");
  }

  return (
    <>
      {taunts.map((t) => (
        <View key={t.id} style={styles.chirp}>
          <Text style={styles.chirpText}>
            <Text style={styles.chirpBy}>{t.mine ? "You" : t.author}: </Text>
            {t.text}
          </Text>
          {t.mine ? (
            <Tap feedback="icon" hitSlop={8} disabled={busy} onPress={() => onRemove(t.id)}>
              <Ionicons name="close" size={14} color={colors.textMuted} />
            </Tap>
          ) : null}
        </View>
      ))}

      {canTaunt ? (
        <>
          {presets?.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetRow}>
              {presets.map((p) => (
                <Tap key={p} style={styles.presetChip} disabled={busy} onPress={() => send(p, true)}>
                  <Text style={styles.presetChipText}>{p}</Text>
                </Tap>
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
            <Tap
              style={[styles.sendBtn, (!draft.trim() || busy) && styles.sendOff]}
              disabled={!draft.trim() || busy}
              onPress={() => send(draft, false)}
            >
              <Ionicons name="arrow-up" size={18} color={colors.goldText} />
            </Tap>
          </View>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
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

/** Shared row chrome for the two cards. */
export const chirpCardStyles = StyleSheet.create({
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
  sub: { color: colors.textMuted, fontWeight: "400" },
  reason: { color: colors.textMuted, fontSize: font.xs },
});

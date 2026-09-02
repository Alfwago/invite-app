import { useCallback, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, font, radius, spacing } from "@/src/theme";

export type PlayerRole = "goalie" | "skater";

type Pending = { name: string; resolve: (r: PlayerRole | null) => void };

/**
 * "Goalie or Skater?" prompt for a Goalie & Skater player a director is adding.
 * `pick(name)` shows the modal and resolves to the choice, or `null` if the
 * director cancels (caller should then abort the whole add). Render `modal`
 * somewhere in the component tree. Prompts every time — no memory.
 */
export function useRolePicker() {
  const [pending, setPending] = useState<Pending | null>(null);
  const nameRef = useRef("");

  const pick = useCallback(
    (name: string) =>
      new Promise<PlayerRole | null>((resolve) => {
        nameRef.current = name;
        setPending({ name, resolve });
      }),
    [],
  );

  const answer = (r: PlayerRole | null) => {
    pending?.resolve(r);
    setPending(null);
  };

  const modal = (
    <Modal
      visible={pending != null}
      transparent
      animationType="fade"
      onRequestClose={() => answer(null)}
    >
      <Pressable style={styles.backdrop} onPress={() => answer(null)}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.name}>{pending?.name ?? nameRef.current}</Text>
          <Text style={styles.q}>Playing goalie or skater tonight?</Text>
          <View style={styles.row}>
            <Pressable style={styles.btn} onPress={() => answer("goalie")}>
              <Text style={styles.btnText}>Goalie</Text>
            </Pressable>
            <Pressable style={styles.btn} onPress={() => answer("skater")}>
              <Text style={styles.btnText}>Skater</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => answer(null)} hitSlop={8} style={styles.cancelHit}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );

  return { pick, modal };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: "center",
  },
  name: { color: colors.text, fontSize: font.md, fontWeight: "800" },
  q: { color: colors.textMuted, fontSize: font.sm, textAlign: "center" },
  row: { flexDirection: "row", gap: spacing.sm, alignSelf: "stretch" },
  btn: {
    flex: 1,
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  btnText: { color: colors.goldText, fontSize: font.base, fontWeight: "800" },
  cancelHit: { paddingVertical: spacing.xs },
  cancel: { color: colors.textMuted, fontSize: font.sm, fontWeight: "700" },
});

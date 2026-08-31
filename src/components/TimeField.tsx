import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatTime } from "@/src/format";
import { colors, radius, spacing } from "@/src/theme";

const STEP = 15; // minutes
const DEFAULT = "20:00";

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function toHHMM(mins: number): string {
  const wrapped = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * 12-hour start-time picker. `value` is a 24-hour "HH:MM" string ("" = unset);
 * `onChange` receives the same. Steps in 15-minute increments so it stays
 * Expo Go-safe (no native date picker).
 */
export function TimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  if (!value) {
    return (
      <Pressable style={styles.setBtn} onPress={() => onChange(DEFAULT)}>
        <Text style={styles.setBtnText}>Set a start time</Text>
      </Pressable>
    );
  }

  const mins = toMinutes(value);
  return (
    <View style={styles.row}>
      <Pressable
        style={styles.step}
        onPress={() => onChange(toHHMM(mins - STEP))}
        hitSlop={8}
      >
        <Text style={styles.stepText}>−</Text>
      </Pressable>
      <Text style={styles.time}>{formatTime(value)}</Text>
      <Pressable
        style={styles.step}
        onPress={() => onChange(toHHMM(mins + STEP))}
        hitSlop={8}
      >
        <Text style={styles.stepText}>+</Text>
      </Pressable>
      <Pressable style={styles.clear} onPress={() => onChange("")} hitSlop={8}>
        <Text style={styles.clearText}>Clear</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  step: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { color: colors.text, fontSize: 20, fontWeight: "800" },
  time: {
    flex: 1,
    textAlign: "center",
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  clear: { paddingHorizontal: spacing.xs },
  clearText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  setBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    backgroundColor: colors.cardRaised,
  },
  setBtnText: { color: colors.gold, fontWeight: "700" },
});

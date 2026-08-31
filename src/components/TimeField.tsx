import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { formatTime } from "@/src/format";
import { colors, radius, spacing } from "@/src/theme";

/**
 * Parse a loosely-typed clock time into a 24-hour "HH:MM" string.
 * Accepts "9", "9pm", "9:30 PM", "930pm", "21:00", "21", "" (=unset).
 * Returns null when it can't make sense of the input.
 */
export function parseClock(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/\./g, "");
  if (!s) return "";
  const m = s.match(/^(\d{1,2})(?::?(\d{2}))?\s*(am?|pm?)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const mer = m[3]?.[0]; // "a" | "p" | undefined
  if (min > 59) return null;
  if (mer === "p" && h !== 12) h += 12;
  if (mer === "a" && h === 12) h = 0;
  if (h > 23) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/**
 * Free-text start-time field. `value` is a 24-hour "HH:MM" string ("" = unset);
 * `onChange` receives the same. The user types in plain 12-hour form
 * ("9:00 PM") and it normalises on blur; the display always shows 12-hour.
 */
export function TimeField({
  value,
  onChange,
  placeholder = "e.g. 9:00 PM",
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(value ? formatTime(value) : "");
  const [error, setError] = useState(false);

  useEffect(() => {
    setText(value ? formatTime(value) : "");
  }, [value]);

  function commit() {
    const parsed = parseClock(text);
    if (parsed === null) {
      setError(true);
      return;
    }
    setError(false);
    onChange(parsed);
    setText(parsed ? formatTime(parsed) : "");
  }

  return (
    <View style={styles.wrap}>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={text}
        onChangeText={(t) => {
          setText(t);
          setError(false);
        }}
        onEndEditing={commit}
        onBlur={commit}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
      />
      {error ? <Text style={styles.hint}>Enter a time like “9:00 PM”</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  inputError: { borderColor: colors.red },
  hint: { color: colors.red, fontSize: 12 },
});

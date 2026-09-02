import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, font, radius, spacing } from "@/src/theme";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const HOURS12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Next whole hour from `min` (or now) — the default when nothing's picked. */
function nextHour(min?: Date): Date {
  const d = min ? new Date(min) : new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

/** Day numbers laid out in weeks (leading/trailing blanks as null). */
function monthGrid(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
}

/**
 * Date + time entry as two tappable chips. Tapping the date chip drops down a
 * month calendar; the time chip drops down hour / minute / AM-PM columns.
 * Pure JS — no native picker module. `value` is a Date (null = unset);
 * `onChange` always receives a full Date.
 */
export function DateTimeField({
  value,
  onChange,
  minimumDate,
}: {
  value: Date | null;
  onChange: (next: Date) => void;
  minimumDate?: Date;
}) {
  const base = value ?? nextHour(minimumDate);
  const [panel, setPanel] = useState<null | "date" | "time">(null);
  const [cursor, setCursor] = useState(() => new Date(base.getFullYear(), base.getMonth(), 1));

  const minDay = minimumDate ? startOfDay(minimumDate) : null;
  const grid = useMemo(
    () => monthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  function toggle(which: "date" | "time") {
    setPanel((p) => (p === which ? null : which));
  }

  function pickDay(day: number) {
    const next = new Date(base);
    next.setFullYear(cursor.getFullYear(), cursor.getMonth(), day);
    onChange(next);
    setPanel(null);
  }

  function setHour12(h12: number) {
    const pm = base.getHours() >= 12;
    const h24 = (h12 % 12) + (pm ? 12 : 0);
    const next = new Date(base);
    next.setHours(h24, base.getMinutes(), 0, 0);
    onChange(next);
  }

  function setMinute(m: number) {
    const next = new Date(base);
    next.setMinutes(m, 0, 0);
    onChange(next);
  }

  function setMeridiem(pm: boolean) {
    const h = base.getHours() % 12;
    const next = new Date(base);
    next.setHours(h + (pm ? 12 : 0), base.getMinutes(), 0, 0);
    onChange(next);
  }

  const selH12 = base.getHours() % 12 === 0 ? 12 : base.getHours() % 12;
  const selPm = base.getHours() >= 12;
  const monthBlocked =
    minDay != null &&
    new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0) < minDay;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Chip
          icon="calendar-outline"
          text={value ? fmtDate(value) : "Pick a date"}
          placeholder={!value}
          active={panel === "date"}
          onPress={() => toggle("date")}
        />
        <Chip
          icon="time-outline"
          text={value ? fmtTime(value) : "Pick a time"}
          placeholder={!value}
          active={panel === "time"}
          onPress={() => toggle("time")}
        />
      </View>

      {panel === "date" ? (
        <View style={styles.panel}>
          <View style={styles.calHead}>
            <Pressable
              onPress={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
              hitSlop={8}
              style={styles.calNav}
            >
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </Pressable>
            <Text style={styles.calTitle}>
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </Text>
            <Pressable
              onPress={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
              hitSlop={8}
              style={styles.calNav}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.calGrid}>
            {WEEKDAYS.map((w, i) => (
              <Text key={`w${i}`} style={styles.calDow}>
                {w}
              </Text>
            ))}
            {grid.map((day, i) => {
              if (day == null) return <View key={`b${i}`} style={styles.calCell} />;
              const cellDate = new Date(cursor.getFullYear(), cursor.getMonth(), day);
              const disabled = minDay != null && startOfDay(cellDate) < minDay;
              const selected = value != null && sameDay(cellDate, value);
              return (
                <Pressable
                  key={`d${day}`}
                  style={styles.calCell}
                  disabled={disabled}
                  onPress={() => pickDay(day)}
                >
                  <View style={[styles.calDay, selected && styles.calDaySel]}>
                    <Text
                      style={[
                        styles.calDayText,
                        selected && styles.calDayTextSel,
                        disabled && styles.calDayTextDim,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          {monthBlocked ? (
            <Text style={styles.calNote}>That month is in the past.</Text>
          ) : null}
        </View>
      ) : null}

      {panel === "time" ? (
        <View style={styles.panel}>
          <View style={styles.timeCols}>
            <WheelCol
              data={HOURS12}
              selected={selH12}
              label={(h) => String(h)}
              onPick={setHour12}
            />
            <Text style={styles.timeColon}>:</Text>
            <WheelCol
              data={MINUTES}
              selected={base.getMinutes() - (base.getMinutes() % 5)}
              label={(m) => String(m).padStart(2, "0")}
              onPick={setMinute}
            />
            <View style={styles.merCol}>
              <Pressable
                style={[styles.merBtn, !selPm && styles.merBtnOn]}
                onPress={() => setMeridiem(false)}
              >
                <Text style={[styles.merText, !selPm && styles.merTextOn]}>AM</Text>
              </Pressable>
              <Pressable
                style={[styles.merBtn, selPm && styles.merBtnOn]}
                onPress={() => setMeridiem(true)}
              >
                <Text style={[styles.merText, selPm && styles.merTextOn]}>PM</Text>
              </Pressable>
            </View>
          </View>
          <Pressable style={styles.doneBtn} onPress={() => setPanel(null)}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function Chip({
  icon,
  text,
  placeholder,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  placeholder: boolean;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress} hitSlop={4}>
      <Ionicons name={icon} size={16} color={colors.gold} />
      <Text style={[styles.chipText, placeholder && styles.chipPlaceholder]} numberOfLines={1}>
        {text}
      </Text>
      <Ionicons
        name={active ? "chevron-up" : "chevron-down"}
        size={14}
        color={colors.textMuted}
      />
    </Pressable>
  );
}

function WheelCol({
  data,
  selected,
  label,
  onPick,
}: {
  data: number[];
  selected: number;
  label: (n: number) => string;
  onPick: (n: number) => void;
}) {
  return (
    <ScrollView
      style={styles.wheel}
      contentContainerStyle={styles.wheelBody}
      showsVerticalScrollIndicator={false}
    >
      {data.map((n) => {
        const on = n === selected;
        return (
          <Pressable key={n} style={[styles.wheelItem, on && styles.wheelItemOn]} onPress={() => onPick(n)}>
            <Text style={[styles.wheelText, on && styles.wheelTextOn]}>{label(n)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { flexDirection: "row", gap: spacing.sm },
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  chipActive: { borderColor: colors.gold },
  chipText: { color: colors.text, fontSize: 15, flex: 1 },
  chipPlaceholder: { color: colors.textMuted },

  panel: {
    backgroundColor: colors.cardRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },

  calHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  calNav: { padding: spacing.xs },
  calTitle: { color: colors.text, fontSize: font.base, fontWeight: "800" },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calDow: {
    width: `${100 / 7}%`,
    textAlign: "center",
    color: colors.textMuted,
    fontSize: font.xs,
    fontWeight: "700",
    paddingVertical: 4,
  },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  calDay: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  calDaySel: { backgroundColor: colors.gold },
  calDayText: { color: colors.text, fontSize: font.sm },
  calDayTextSel: { color: colors.goldText, fontWeight: "800" },
  calDayTextDim: { color: colors.border },
  calNote: { color: colors.textMuted, fontSize: font.xs, textAlign: "center" },

  timeCols: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
  timeColon: { color: colors.text, fontSize: font.lg, fontWeight: "800" },
  wheel: { maxHeight: 168, width: 56 },
  wheelBody: { paddingVertical: 4 },
  wheelItem: { paddingVertical: 8, alignItems: "center", borderRadius: radius.sm },
  wheelItemOn: { backgroundColor: colors.gold },
  wheelText: { color: colors.text, fontSize: font.base, fontVariant: ["tabular-nums"] },
  wheelTextOn: { color: colors.goldText, fontWeight: "800" },
  merCol: { gap: spacing.xs, marginLeft: spacing.sm },
  merBtn: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  merBtnOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  merText: { color: colors.textMuted, fontSize: font.sm, fontWeight: "800" },
  merTextOn: { color: colors.goldText },

  doneBtn: {
    alignSelf: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
  },
  doneText: { color: colors.goldText, fontWeight: "800", fontSize: font.sm },
});

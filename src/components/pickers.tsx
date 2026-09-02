import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { formatEventDate, formatTime } from "@/src/format";
import { colors, font, radius, spacing } from "@/src/theme";

// ---- shared helpers -------------------------------------------------------

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

/** Next whole hour from `min` (or now). */
function nextHour(min?: Date): Date {
  const d = min ? new Date(min) : new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

function monthGrid(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const p2 = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" -> local Date (or null). */
function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

const toYmd = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

/** "HH:MM" (24h) -> {h, m} (or null). */
function parseHm(s: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return { h, m: min };
}

// ---- chip + panel shell -------------------------------------------------

function FieldChip({
  icon,
  text,
  placeholder,
  open,
  onPress,
  onClear,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  placeholder: boolean;
  open: boolean;
  onPress: () => void;
  onClear?: () => void;
}) {
  return (
    <Pressable style={[styles.chip, open && styles.chipOpen]} onPress={onPress} hitSlop={4}>
      <Ionicons name={icon} size={16} color={colors.gold} />
      <Text style={[styles.chipText, placeholder && styles.chipPlaceholder]} numberOfLines={1}>
        {text}
      </Text>
      {onClear ? (
        <Pressable onPress={onClear} hitSlop={8}>
          <Ionicons name="close-circle" size={16} color={colors.textMuted} />
        </Pressable>
      ) : null}
      <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={colors.textMuted} />
    </Pressable>
  );
}

// ---- calendar panel ---------------------------------------------------

function CalendarPanel({
  selected,
  minimumDate,
  onPick,
}: {
  selected: Date | null;
  minimumDate?: Date;
  onPick: (d: Date) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const b = selected ?? minimumDate ?? new Date();
    return new Date(b.getFullYear(), b.getMonth(), 1);
  });
  const minDay = minimumDate ? startOfDay(minimumDate) : null;
  const grid = useMemo(() => monthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const monthBlocked =
    minDay != null && new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0) < minDay;

  return (
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
          const isSel = selected != null && sameDay(cellDate, selected);
          return (
            <Pressable
              key={`d${day}`}
              style={styles.calCell}
              disabled={disabled}
              onPress={() => onPick(cellDate)}
            >
              <View style={[styles.calDay, isSel && styles.calDaySel]}>
                <Text
                  style={[
                    styles.calDayText,
                    isSel && styles.calDayTextSel,
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
      {monthBlocked ? <Text style={styles.note}>That month is in the past.</Text> : null}
    </View>
  );
}

// ---- time panel -----------------------------------------------------

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
          <Pressable
            key={n}
            style={[styles.wheelItem, on && styles.wheelItemOn]}
            onPress={() => onPick(n)}
          >
            <Text style={[styles.wheelText, on && styles.wheelTextOn]}>{label(n)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function TimePanel({
  h24,
  minute,
  onChange,
  onDone,
}: {
  h24: number;
  minute: number;
  onChange: (h24: number, m: number) => void;
  onDone: () => void;
}) {
  const pm = h24 >= 12;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;

  return (
    <View style={styles.panel}>
      <View style={styles.timeCols}>
        <WheelCol
          data={HOURS12}
          selected={h12}
          label={(h) => String(h)}
          onPick={(newH12) => onChange((newH12 % 12) + (pm ? 12 : 0), minute)}
        />
        <Text style={styles.timeColon}>:</Text>
        <WheelCol
          data={MINUTES}
          selected={minute - (minute % 5)}
          label={(m) => p2(m)}
          onPick={(m) => onChange(h24, m)}
        />
        <View style={styles.merCol}>
          <Pressable
            style={[styles.merBtn, !pm && styles.merBtnOn]}
            onPress={() => onChange(h24 % 12, minute)}
          >
            <Text style={[styles.merText, !pm && styles.merTextOn]}>AM</Text>
          </Pressable>
          <Pressable
            style={[styles.merBtn, pm && styles.merBtnOn]}
            onPress={() => onChange((h24 % 12) + 12, minute)}
          >
            <Text style={[styles.merText, pm && styles.merTextOn]}>PM</Text>
          </Pressable>
        </View>
      </View>
      <Pressable style={styles.doneBtn} onPress={onDone}>
        <Text style={styles.doneText}>Done</Text>
      </Pressable>
    </View>
  );
}

// ---- public fields --------------------------------------------------

/** Calendar dropdown. `value` is "" or "YYYY-MM-DD". */
export function DateField({
  value,
  onChange,
  minimumDate,
  placeholder = "Choose a date",
}: {
  value: string;
  onChange: (next: string) => void;
  minimumDate?: Date;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseYmd(value);

  return (
    <View style={styles.wrap}>
      <FieldChip
        icon="calendar-outline"
        text={selected ? formatEventDate(value) : placeholder}
        placeholder={!selected}
        open={open}
        onPress={() => setOpen((o) => !o)}
        onClear={selected ? () => onChange("") : undefined}
      />
      {open ? (
        <CalendarPanel
          selected={selected}
          minimumDate={minimumDate}
          onPick={(d) => {
            onChange(toYmd(d));
            setOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}

/** Time dropdown. `value` is "" or "HH:MM" (24-hour). */
export function ClockField({
  value,
  onChange,
  placeholder = "Choose a time",
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const parsed = parseHm(value);

  return (
    <View style={styles.wrap}>
      <FieldChip
        icon="time-outline"
        text={parsed ? formatTime(value) : placeholder}
        placeholder={!parsed}
        open={open}
        onPress={() => setOpen((o) => !o)}
        onClear={parsed ? () => onChange("") : undefined}
      />
      {open ? (
        <TimePanel
          h24={parsed?.h ?? 19}
          minute={parsed?.m ?? 0}
          onChange={(h, m) => onChange(`${p2(h)}:${p2(m)}`)}
          onDone={() => setOpen(false)}
        />
      ) : null}
    </View>
  );
}

/** Number dropdown. `value` is "" or a whole number as a string. */
export function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  placeholder = "Choose a number",
}: {
  value: string;
  onChange: (next: string) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = /^\d+$/.test(value) ? Number(value) : null;
  const nums = useMemo(() => {
    const out: number[] = [];
    for (let n = min; n <= max; n += step) out.push(n);
    return out;
  }, [min, max, step]);

  return (
    <View style={styles.wrap}>
      <FieldChip
        icon="people-outline"
        text={current != null ? `${current}${unit ? ` ${unit}` : ""}` : placeholder}
        placeholder={current == null}
        open={open}
        onPress={() => setOpen((o) => !o)}
        onClear={current != null ? () => onChange("") : undefined}
      />
      {open ? (
        <View style={styles.panel}>
          <ScrollView
            style={styles.numList}
            contentContainerStyle={styles.wheelBody}
            showsVerticalScrollIndicator={false}
          >
            {nums.map((n) => {
              const on = n === current;
              return (
                <Pressable
                  key={n}
                  style={[styles.numItem, on && styles.wheelItemOn]}
                  onPress={() => {
                    onChange(String(n));
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.wheelText, on && styles.wheelTextOn]}>
                    {n}
                    {unit ? ` ${unit}` : ""}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Combined date + time as two chips, producing one Date. `value` is a Date
 * (null = unset); `onChange` always receives a full Date.
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

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.half}>
          <FieldChip
            icon="calendar-outline"
            text={value ? formatEventDate(toYmd(value)) : "Pick a date"}
            placeholder={!value}
            open={panel === "date"}
            onPress={() => setPanel((p) => (p === "date" ? null : "date"))}
          />
        </View>
        <View style={styles.half}>
          <FieldChip
            icon="time-outline"
            text={value ? formatTime(`${p2(base.getHours())}:${p2(base.getMinutes())}`) : "Pick a time"}
            placeholder={!value}
            open={panel === "time"}
            onPress={() => setPanel((p) => (p === "time" ? null : "time"))}
          />
        </View>
      </View>

      {panel === "date" ? (
        <CalendarPanel
          selected={value}
          minimumDate={minimumDate}
          onPick={(d) => {
            const next = new Date(base);
            next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
            onChange(next);
            setPanel(null);
          }}
        />
      ) : null}

      {panel === "time" ? (
        <TimePanel
          h24={base.getHours()}
          minute={base.getMinutes()}
          onChange={(h, m) => {
            const next = new Date(base);
            next.setHours(h, m, 0, 0);
            onChange(next);
          }}
          onDone={() => setPanel(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { flexDirection: "row", gap: spacing.sm },
  half: { flex: 1 },

  chip: {
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
  chipOpen: { borderColor: colors.gold },
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
  note: { color: colors.textMuted, fontSize: font.xs, textAlign: "center" },

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

  timeCols: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
  timeColon: { color: colors.text, fontSize: font.lg, fontWeight: "800" },
  wheel: { maxHeight: 168, width: 56 },
  numList: { maxHeight: 200 },
  wheelBody: { paddingVertical: 4 },
  wheelItem: { paddingVertical: 8, alignItems: "center", borderRadius: radius.sm },
  numItem: { paddingVertical: 10, paddingHorizontal: spacing.md, alignItems: "center", borderRadius: radius.sm },
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

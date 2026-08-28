import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { colors, radius, spacing } from "@/src/theme";

// ---- Button -------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "danger";

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const bg =
    variant === "primary" ? colors.gold : variant === "danger" ? colors.red : colors.cardRaised;
  const fg = variant === "secondary" ? colors.text : colors.goldText;
  const border = variant === "secondary" ? colors.border : bg;
  const isOff = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isOff}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: border },
        (pressed || isOff) && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

// ---- Badge --------------------------------------------------------------
// Outlined pills, matching theme.css: dim fill, 1px colored border, colored
// text. One rule for tone — good / caution / bad — plus gold for "locked"
// and a solid "goalie" chip.

export type BadgeTone = "neutral" | "gold" | "good" | "caution" | "bad" | "goalie";

const TONES: Record<BadgeTone, { bg: string; border: string; fg: string }> = {
  neutral: { bg: "#0c0c0c", border: colors.border, fg: "#cfcfcf" },
  gold: { bg: colors.goldDim, border: colors.gold, fg: colors.gold },
  good: { bg: colors.greenDim, border: colors.green, fg: colors.green },
  caution: { bg: colors.amberDim, border: colors.amber, fg: colors.amber },
  bad: { bg: colors.redDim, border: colors.red, fg: colors.red },
  goalie: { bg: colors.gold, border: colors.gold, fg: colors.goldText },
};

export function Badge({ text, tone = "neutral" }: { text: string; tone?: BadgeTone }) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={[styles.badgeText, { color: t.fg }]}>{text}</Text>
    </View>
  );
}

// ---- FillBar ----------------------------------------------------------
// Capacity / fill bar (theme.css .fill-bar). Always pair with the raw
// "X / Y" count in the surrounding markup — the bar alone isn't enough.

export function FillBar({
  pct,
  tone = "caution",
}: {
  pct: number;
  tone?: "good" | "caution" | "bad";
}) {
  const c = tone === "good" ? colors.green : tone === "bad" ? colors.red : colors.amber;
  const w = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <View style={styles.fillTrack}>
      {w > 0 ? <View style={[styles.fillValue, { flexGrow: w, backgroundColor: c }]} /> : null}
      {w < 100 ? <View style={{ flexGrow: 100 - w }} /> : null}
    </View>
  );
}

// ---- Card --------------------------------------------------------------
// accent="public" -> gold left border (anything players can see);
// accent="director" -> red left border (director-only).

export function Card({
  children,
  accent,
  style,
}: {
  children: ReactNode;
  accent?: "public" | "director";
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        styles.card,
        accent === "public" && styles.cardPublic,
        accent === "director" && styles.cardDirector,
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ---- Loading / error / empty placeholders -----------------------------

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.gold} size="large" />
      {label ? <Text style={styles.muted}>{label}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.muted}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    borderWidth: 1,
  },
  btnText: { fontSize: 15, fontWeight: "700" },
  badge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardPublic: { borderLeftWidth: 4, borderLeftColor: colors.gold },
  cardDirector: { borderLeftWidth: 4, borderLeftColor: colors.red },
  fillTrack: {
    width: "100%",
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: "#1f1f1f",
    overflow: "hidden",
    flexDirection: "row",
  },
  fillValue: { borderRadius: radius.pill },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  muted: { color: colors.textMuted, textAlign: "center" },
  errorText: { color: colors.red, textAlign: "center", fontWeight: "600" },
});

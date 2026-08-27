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
    variant === "primary" ? colors.gold : variant === "danger" ? colors.red : colors.card;
  const fg = variant === "primary" ? colors.goldText : colors.text;
  const isOff = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isOff}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: variant === "secondary" ? colors.border : bg },
        variant === "secondary" && styles.btnBordered,
        (pressed || isOff) && { opacity: 0.6 },
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

export function Badge({ text, color }: { text: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

// ---- Card --------------------------------------------------------------

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
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
  btnBordered: { borderColor: colors.border },
  btnText: { fontSize: 16, fontWeight: "600" },
  badge: {
    borderRadius: radius.sm,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    alignSelf: "flex-start",
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  muted: { color: colors.textMuted, textAlign: "center" },
  errorText: { color: colors.red, textAlign: "center", fontWeight: "600" },
});

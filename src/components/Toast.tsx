import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AccessibilityInfo, Animated, StyleSheet, Text } from "react-native";

import { errorHaptic, successHaptic } from "@/src/haptics";
import { colors, font, radius, spacing } from "@/src/theme";

// A brief, non-blocking confirmation ("Teams balanced") for actions that
// don't otherwise change much on screen. One at a time — a new toast
// replaces the old one and restarts the timer. Never for anything the
// director must acknowledge: those stay Alerts.

export type ToastKind = "success" | "info" | "error";

type ToastMsg = { id: number; text: string; kind: ToastKind };

const HIDE_AFTER_MS = 2000;

const ToastContext = createContext<{
  show: (text: string, kind?: ToastKind) => void;
  current: ToastMsg | null;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastMsg | null>(null);
  const seq = useRef(0);

  const show = useCallback((text: string, kind: ToastKind = "success") => {
    seq.current += 1;
    setCurrent({ id: seq.current, text, kind });
    if (kind === "success") successHaptic();
    else if (kind === "error") errorHaptic();
    AccessibilityInfo.announceForAccessibility(text);
  }, []);

  const value = useMemo(() => ({ show, current }), [show, current]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

/** `toast.show("Teams balanced")`. A no-op outside ToastProvider. */
export function useToast() {
  const ctx = useContext(ToastContext);
  return useMemo(() => ({ show: ctx?.show ?? (() => {}) }), [ctx?.show]);
}

/**
 * Where toasts draw: absolutely positioned at the bottom of its parent, so
 * the root layout puts it in the view that holds the screens, just above the
 * bottom bar. Ignores touches — it never blocks what's under it.
 */
export function ToastHost() {
  const ctx = useContext(ToastContext);
  const current = ctx?.current ?? null;
  const [shown, setShown] = useState<ToastMsg | null>(null);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!current) return;
    setShown(current);
    anim.stopAnimation();
    Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(
        ({ finished }) => finished && setShown(null),
      );
    }, HIDE_AFTER_MS);
    return () => clearTimeout(t);
  }, [current, anim]);

  if (!shown) return null;
  const tone =
    shown.kind === "error"
      ? { borderColor: colors.red, color: colors.red }
      : { borderColor: colors.gold, color: colors.text };
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}
    >
      <Text
        style={[styles.toast, { borderColor: tone.borderColor, color: tone.color }]}
        accessibilityLiveRegion="polite"
      >
        {shown.kind === "success" ? "✓  " : ""}
        {shown.text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    alignItems: "center",
  },
  toast: {
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    fontSize: font.sm,
    fontWeight: "700",
    overflow: "hidden",
    textAlign: "center",
  },
});

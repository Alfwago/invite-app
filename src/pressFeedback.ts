import type { ViewStyle } from "react-native";

// One pressed look for every tappable thing, so a tap always looks like a
// tap. "button" for anything button-shaped, "row" for full-width list rows
// (no scale — a whole row shrinking reads as a glitch), "icon" for small
// icon/text links, "none" for backdrops and sheets that only catch taps.

export type TapFeedback = "button" | "row" | "icon" | "none";

const FX: Record<TapFeedback, ViewStyle | null> = {
  button: { opacity: 0.6, transform: [{ scale: 0.96 }] },
  row: { opacity: 0.55 },
  icon: { opacity: 0.4, transform: [{ scale: 0.88 }] },
  none: null,
};

export function pressFx(kind: TapFeedback = "button"): ViewStyle | null {
  return FX[kind];
}

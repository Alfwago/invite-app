import { Pressable, type PressableProps } from "react-native";

import { tapHaptic } from "@/src/haptics";
import { pressFx, type TapFeedback } from "@/src/pressFeedback";

export type { TapFeedback };

/**
 * Pressable with the app's pressed state built in (see pressFeedback.ts).
 * `style` may be a style or a ({ pressed }) => style function, same as
 * Pressable. `haptic` adds a light tap on press — main action buttons only.
 */
export function Tap({
  feedback = "button",
  haptic,
  style,
  onPress,
  ...rest
}: PressableProps & { feedback?: TapFeedback; haptic?: boolean }) {
  return (
    <Pressable
      {...rest}
      onPress={
        onPress && haptic
          ? (e) => {
              tapHaptic();
              onPress(e);
            }
          : onPress
      }
      style={(state) => [
        typeof style === "function" ? style(state) : style,
        state.pressed && pressFx(feedback),
      ]}
    />
  );
}

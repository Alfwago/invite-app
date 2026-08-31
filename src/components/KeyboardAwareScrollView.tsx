import type { ComponentProps, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";

type Props = ComponentProps<typeof ScrollView> & {
  children: ReactNode;
  /** Extra offset for a navigation header, if the screen has one. */
  headerOffset?: number;
};

/**
 * A ScrollView that lifts its content above the on-screen keyboard the way
 * the native iOS apps do: the focused field scrolls into view, and dragging
 * or tapping outside dismisses the keyboard.
 */
export function KeyboardAwareScrollView({
  children,
  contentContainerStyle,
  headerOffset = 0,
  ...rest
}: Props) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={headerOffset}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={contentContainerStyle}
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });

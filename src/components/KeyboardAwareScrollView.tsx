import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
import { HeaderHeightContext } from "@react-navigation/elements";

type Props = ComponentProps<typeof ScrollView> & {
  children: ReactNode;
  /** Android: offset for a navigation header. Defaults to the measured
   *  header height of the screen this sits in (0 without one). */
  headerOffset?: number;
};

/** Room left above a field scrolled to the top, so its label stays visible. */
const TOP_MARGIN = 12;

type FocusScroll = {
  focus: (field: TextInput | null) => void;
  blur: (field: TextInput | null) => void;
};
const FocusScrollContext = createContext<FocusScroll | null>(null);

/**
 * A ScrollView that keeps the focused field above the on-screen keyboard.
 *
 * - iOS: the ScrollView's own automatic keyboard insets (no
 *   KeyboardAvoidingView — under a Stack header that needed a header offset
 *   and still left the bottom of the content under the keyboard).
 * - Android: KeyboardAvoidingView "height", offset by the header height.
 *
 * A field that wants its results visible while typing (a search box, the
 * walk-on fields) uses `useFocusScroll()`: on focus it's scrolled near the
 * top, and kept there while the content under it grows (search results
 * arriving), until it loses focus or the keyboard closes.
 */
export function KeyboardAwareScrollView({
  children,
  contentContainerStyle,
  headerOffset,
  onContentSizeChange,
  ...rest
}: Props) {
  const measuredHeader = useContext(HeaderHeightContext) ?? 0;
  const scrollRef = useRef<ScrollView>(null);
  const pinned = useRef<TextInput | null>(null);

  const scrollToPinned = useCallback(() => {
    const field = pinned.current;
    const scroll = scrollRef.current;
    // getInnerViewRef exists at runtime (RN 0.81) but not in the .d.ts.
    const inner = (scroll as unknown as { getInnerViewRef?: () => unknown } | null)?.getInnerViewRef?.();
    if (!field || !scroll || !inner) return;
    try {
      field.measureLayout(
        inner as never,
        (_x, y) => scroll.scrollTo({ y: Math.max(0, y - TOP_MARGIN), animated: true }),
        () => {},
      );
    } catch {
      // the field unmounted mid-measure — nothing to scroll to
    }
  }, []);

  const ctx = useMemo<FocusScroll>(
    () => ({
      focus: (field) => {
        pinned.current = field;
        // Once now, and again when the keyboard's inset is in place (before
        // that the ScrollView can't scroll far enough down).
        setTimeout(scrollToPinned, 50);
      },
      blur: (field) => {
        if (pinned.current === field) pinned.current = null;
      },
    }),
    [scrollToPinned],
  );

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => scrollToPinned());
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      pinned.current = null;
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [scrollToPinned]);

  const scroll = (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
      contentContainerStyle={contentContainerStyle}
      onContentSizeChange={(w, h) => {
        if (pinned.current) scrollToPinned();
        onContentSizeChange?.(w, h);
      }}
      {...rest}
    >
      {children}
    </ScrollView>
  );

  return (
    <FocusScrollContext.Provider value={ctx}>
      {Platform.OS === "ios" ? (
        scroll
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="height"
          keyboardVerticalOffset={headerOffset ?? measuredHeader}
        >
          {scroll}
        </KeyboardAvoidingView>
      )}
    </FocusScrollContext.Provider>
  );
}

/**
 * Spread onto a TextInput inside a KeyboardAwareScrollView to scroll it near
 * the top when it gets focus (`<TextInput {...useFocusScroll()} />`). Keeps
 * any onFocus/onBlur you pass. Outside one it does nothing.
 */
export function useFocusScroll(handlers?: {
  onFocus?: ComponentProps<typeof TextInput>["onFocus"];
  onBlur?: ComponentProps<typeof TextInput>["onBlur"];
}) {
  const fs = useContext(FocusScrollContext);
  const ref = useRef<TextInput>(null);
  const { onFocus, onBlur } = handlers ?? {};
  return {
    ref,
    onFocus: ((e) => {
      fs?.focus(ref.current);
      onFocus?.(e);
    }) as NonNullable<ComponentProps<typeof TextInput>["onFocus"]>,
    onBlur: ((e) => {
      fs?.blur(ref.current);
      onBlur?.(e);
    }) as NonNullable<ComponentProps<typeof TextInput>["onBlur"]>,
  };
}

const styles = StyleSheet.create({ flex: { flex: 1 } });

import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackHeaderProps } from "@react-navigation/native-stack";

import { colors } from "@/src/theme";

/**
 * One header for every Stack screen — a flat bar (no iOS 26 glass), a
 * consistent gold "‹ Back", a centered title, and whatever `headerRight`
 * the screen sets. Wired as `screenOptions.header` in app/_layout.tsx.
 */
export function NavHeader({ navigation, route, options, back }: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();
  const title =
    typeof options.headerTitle === "string"
      ? options.headerTitle
      : (options.title ?? route.name);
  const right = options.headerRight?.({ canGoBack: !!back, tintColor: colors.gold });
  const isModal = options.presentation === "modal" || options.presentation === "formSheet";

  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <View style={styles.side}>
        {back ? (
          <Pressable onPress={navigation.goBack} style={styles.back} hitSlop={8}>
            <Ionicons
              name={isModal ? "close" : "chevron-back"}
              size={isModal ? 24 : 26}
              color={colors.gold}
            />
            {isModal ? null : <Text style={styles.backText}>Back</Text>}
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={[styles.side, styles.rightSide]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: Platform.OS === "ios" ? 44 : 52,
    paddingHorizontal: 6,
    paddingBottom: 8,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  side: { minWidth: 88, justifyContent: "center" },
  rightSide: { alignItems: "flex-end" },
  back: { flexDirection: "row", alignItems: "center" },
  backText: { color: colors.gold, fontSize: 17, fontWeight: "500", marginLeft: -3 },
  title: {
    flex: 1,
    textAlign: "center",
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
});

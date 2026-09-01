import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useBoards, useInbox } from "@/src/hooks/queries";
import { colors, font } from "@/src/theme";

type Item = {
  href: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: (path: string) => boolean;
};

// Everything that isn't clearly an Events / Messages / Profile screen counts
// as "Home" (director tools, players, teams, polls, inbox, notices…).
const TABS: Item[] = [
  {
    href: "/",
    label: "Home",
    icon: "home",
    active: (p) =>
      !p.startsWith("/events") &&
      !p.startsWith("/event/") &&
      !p.startsWith("/messages") &&
      !p.startsWith("/profile"),
  },
  {
    href: "/events",
    label: "Events",
    icon: "calendar",
    active: (p) => p.startsWith("/events") || p.startsWith("/event/"),
  },
  {
    href: "/messages",
    label: "Messages",
    icon: "chatbubbles",
    active: (p) => p.startsWith("/messages"),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: "person",
    active: (p) => p.startsWith("/profile"),
  },
];

/**
 * A persistent bottom nav rendered at the root, above the router Stack, so it
 * stays on every screen. The real <Tabs> bar is hidden; this drives it.
 */
export function BottomBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const boards = useBoards();
  const inbox = useInbox();
  const unread = (boards.data?.unread_total ?? 0) + (inbox.data?.unread_total ?? 0);

  if (pathname === "/login" || pathname.startsWith("/login")) return null;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {TABS.map((t) => {
        const on = t.active(pathname);
        return (
          <Pressable
            key={t.href}
            style={styles.item}
            onPress={() => router.navigate(t.href as never)}
            hitSlop={6}
          >
            <View>
              <Ionicons
                name={on ? t.icon : (`${t.icon}-outline` as keyof typeof Ionicons.glyphMap)}
                size={24}
                color={on ? colors.gold : colors.textMuted}
              />
              {t.label === "Messages" && unread > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, on && styles.labelOn]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  item: { flex: 1, alignItems: "center", gap: 3 },
  label: { color: colors.textMuted, fontSize: font.xs, fontWeight: "600" },
  labelOn: { color: colors.gold },
  badge: {
    position: "absolute",
    top: -5,
    right: -10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
});

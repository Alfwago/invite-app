import { StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/src/auth/AuthContext";
import { Tap } from "@/src/components/Tap";
import { useApprovals, useBoards, useInbox } from "@/src/hooks/queries";
import { navTabs } from "@/src/navTabs";
import { colors, font } from "@/src/theme";

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
  // 1.8.0 #8: a Directors tab for directors, badged with pending approvals.
  const { me } = useAuth();
  const isDirector = !!me?.is_director;
  const approvals = useApprovals(isDirector);
  const pending = isDirector ? (approvals.data?.length ?? 0) : 0;

  if (pathname === "/login" || pathname.startsWith("/login")) return null;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {navTabs(isDirector).map((t) => {
        const on = t.active(pathname);
        const badge = t.key === "messages" ? unread : t.key === "directors" ? pending : 0;
        return (
          <Tap
            feedback="row"
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
              {badge > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, on && styles.labelOn]}>{t.label}</Text>
          </Tap>
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

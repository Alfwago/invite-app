import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";

import { useBoards, useInbox } from "@/src/hooks/queries";
import { setAppBadge } from "@/src/push";
import { colors } from "@/src/theme";

/**
 * The four tab screens. The native tab bar is hidden — a persistent
 * <BottomBar> rendered at the root drives navigation so it stays visible on
 * every screen, not just these four.
 */
export default function TabsLayout() {
  const router = useRouter();
  const boards = useBoards();
  const inbox = useInbox();
  const dmUnread = inbox.data?.unread_total ?? 0;
  const unread = (boards.data?.unread_total ?? 0) + dmUnread;

  useEffect(() => {
    setAppBadge(unread);
  }, [unread]);

  const inboxButton = () => (
    <Pressable onPress={() => router.push("/inbox")} hitSlop={8} style={{ marginRight: 12 }}>
      <Ionicons name="mail-outline" size={22} color={colors.text} />
      {dmUnread > 0 ? (
        <View
          style={{
            position: "absolute",
            top: -3,
            right: -4,
            minWidth: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: colors.red,
          }}
        />
      ) : null}
    </Pressable>
  );

  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.bg,
          borderBottomWidth: 2,
          borderBottomColor: colors.gold,
        },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text, fontWeight: "800", fontSize: 20 },
        headerTintColor: colors.text,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", headerShown: false }} />
      <Tabs.Screen name="events" options={{ title: "Events" }} />
      <Tabs.Screen name="messages" options={{ title: "Messages", headerRight: inboxButton }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";

import { useBoards, useInbox } from "@/src/hooks/queries";
import { setAppBadge } from "@/src/push";
import { colors } from "@/src/theme";

export default function TabsLayout() {
  const router = useRouter();
  const boards = useBoards();
  const inbox = useInbox();
  const boardUnread = boards.data?.unread_total ?? 0;
  const dmUnread = inbox.data?.unread_total ?? 0;
  const unread = boardUnread + dmUnread;

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
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.bg,
          borderBottomWidth: 2,
          borderBottomColor: colors.gold,
        },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text, fontWeight: "800", fontSize: 20 },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontWeight: "600" },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          headerRight: inboxButton,
          tabBarBadge: unread > 0 ? (unread > 99 ? "99+" : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.red, color: "#fff", fontSize: 11 },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

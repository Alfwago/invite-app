import { useEffect } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";

import { Tap } from "@/src/components/Tap";
import { useBoards, useEvents, useInbox } from "@/src/hooks/queries";
import { pendingInviteCount } from "@/src/inviteBadge";
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
  const events = useEvents();
  const dmUnread = inbox.data?.unread_total ?? 0;
  // Mirrors the server's `pending_invite_count`: an open invite this player
  // hasn't acted on, for a skate that hasn't started (once it happens it
  // drops off, answered or not). `my_rsvp` is null for events the player
  // can see but isn't invited to (a director's other nights).
  const pendingInvites = pendingInviteCount(events.data ?? []);
  const unread = (boards.data?.unread_total ?? 0) + dmUnread + pendingInvites;

  useEffect(() => {
    setAppBadge(unread);
  }, [unread]);

  const inboxButton = () => (
    <Tap onPress={() => router.push("/inbox")} hitSlop={8} style={{ marginRight: 12 }}>
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
    </Tap>
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

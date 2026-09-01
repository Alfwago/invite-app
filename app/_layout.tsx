import { useEffect } from "react";
import { AppState, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";

import { AuthProvider, useAuth } from "@/src/auth/AuthContext";
import { BottomBar } from "@/src/components/BottomBar";
import { NavHeader } from "@/src/components/NavHeader";
import { Loading } from "@/src/components/ui";
import { keys } from "@/src/hooks/queries";
import { configureAndroidChannels, pushSupported } from "@/src/push";
import { colors } from "@/src/theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: true },
  },
});

// React Query's built-in focus tracking only understands the web's
// visibility/focus events, so `refetchOnWindowFocus` never fires in a native
// app on its own. Wire it to React Native's AppState so stale queries refetch
// whenever the app comes back to the foreground.
focusManager.setEventListener((handleFocus) => {
  const sub = AppState.addEventListener("change", (state) => {
    handleFocus(state === "active");
  });
  return () => sub.remove();
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

type PushData = {
  eventId?: number | string;
  kind?: string;
  type?: string;
  from?: number | string;
} | null;

/**
 * Tapping a push opens what it's about; a push that lands while the app is
 * open refreshes the caches it touches so the UI updates without a manual pull.
 */
function useNotificationHandling() {
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    // expo-notifications isn't available on web or in Expo Go (SDK 53+).
    if (!pushSupported) return;
    const Notifications = require("expo-notifications");

    // Make sure the Android channels exist before any notification lands.
    configureAndroidChannels();

    function open(data: unknown) {
      const d = data as PushData;
      if (d?.kind === "board") {
        router.push("/(tabs)/messages");
      } else if (d?.kind === "dm") {
        router.push(d.from != null ? `/inbox/${d.from}` : "/inbox");
      } else if (d?.type === "team_assignment" && d.eventId != null) {
        router.push(`/event/${d.eventId}`);
      } else if (d?.eventId != null) {
        router.push(`/event/${d.eventId}`);
      }
    }

    /** Refresh the queries a foreground push affects. */
    function refresh(data: unknown) {
      const d = data as PushData;
      qc.invalidateQueries({ queryKey: keys.home });
      if (d?.kind === "dm") qc.invalidateQueries({ queryKey: keys.inbox });
      if (d?.kind === "board") qc.invalidateQueries({ queryKey: keys.boards });
      if (d?.eventId != null) {
        qc.invalidateQueries({ queryKey: keys.event(d.eventId) });
        qc.invalidateQueries({ queryKey: ["events"] });
      }
    }

    Notifications.getLastNotificationResponseAsync().then((response: unknown) => {
      const r = response as { notification: { request: { content: { data: unknown } } } } | null;
      if (r) open(r.notification.request.content.data);
    });

    const tapSub = Notifications.addNotificationResponseReceivedListener(
      (response: { notification: { request: { content: { data: unknown } } } }) => {
        open(response.notification.request.content.data);
      },
    );
    const recvSub = Notifications.addNotificationReceivedListener(
      (notification: { request: { content: { data: unknown } } }) => {
        refresh(notification.request.content.data);
      },
    );
    return () => {
      tapSub.remove();
      recvSub.remove();
    };
  }, [router, qc]);
}

function RootNavigator() {
  const { ready, token } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useNotificationHandling();

  useEffect(() => {
    if (!ready) return;
    const inAuthScreen = segments[0] === "login";
    if (!token && !inAuthScreen) {
      router.replace("/login");
    } else if (token && inAuthScreen) {
      router.replace("/");
    }
  }, [ready, token, segments, router]);

  if (!ready) return <Loading label="Starting up…" />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <Stack
      screenOptions={{
        header: (props) => <NavHeader {...props} />,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="event/[id]/index" options={{ title: "Event" }} />
      <Stack.Screen name="event/[id]/manage" options={{ title: "Manage event" }} />
      <Stack.Screen name="event/[id]/messages" options={{ title: "Messages" }} />
      <Stack.Screen name="notices" options={{ title: "League notices" }} />
      <Stack.Screen name="skate-groups" options={{ title: "Skate-group members" }} />
      <Stack.Screen name="night/[id]/members" options={{ title: "Members" }} />
      <Stack.Screen name="players/index" options={{ title: "Player profiles" }} />
      <Stack.Screen name="players/[id]" options={{ title: "Player" }} />
      <Stack.Screen name="teams/index" options={{ title: "Team generator" }} />
      <Stack.Screen name="teams/history" options={{ title: "Saved splits" }} />
      <Stack.Screen name="approvals" options={{ title: "Player approvals" }} />
      <Stack.Screen name="director" options={{ title: "Director dashboard" }} />
      <Stack.Screen name="polls/index" options={{ title: "Polls" }} />
      <Stack.Screen name="polls/[id]" options={{ title: "Poll" }} />
      <Stack.Screen name="polls/manage" options={{ title: "Polls" }} />
      <Stack.Screen name="polls/new" options={{ title: "New poll", presentation: "modal" }} />
      <Stack.Screen name="inbox/index" options={{ title: "Inbox" }} />
      <Stack.Screen name="inbox/[id]" options={{ title: "Message" }} />
      <Stack.Screen
        name="new-event"
        options={{ title: "New event", presentation: "modal" }}
      />
    </Stack>
      <BottomBar />
    </View>
  );
}

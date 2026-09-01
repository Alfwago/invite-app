import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider, useAuth } from "@/src/auth/AuthContext";
import { Loading } from "@/src/components/ui";
import { configureAndroidChannels, pushSupported } from "@/src/push";
import { colors } from "@/src/theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: true },
  },
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

/** Tapping a push notification opens the event it's about. */
function useNotificationRouting() {
  const router = useRouter();

  useEffect(() => {
    // expo-notifications isn't available on web or in Expo Go (SDK 53+).
    if (!pushSupported) return;
    const Notifications = require("expo-notifications");

    // Make sure the Android channels exist before any notification lands.
    configureAndroidChannels();

    function open(data: unknown) {
      const d = data as { eventId?: number | string; kind?: string } | null;
      if (d?.kind === "board") {
        router.push("/(tabs)/messages");
      } else if (d?.eventId != null) {
        router.push(`/event/${d.eventId}`);
      }
    }

    Notifications.getLastNotificationResponseAsync().then((response: unknown) => {
      const r = response as { notification: { request: { content: { data: unknown } } } } | null;
      if (r) open(r.notification.request.content.data);
    });

    const sub = Notifications.addNotificationResponseReceivedListener(
      (response: { notification: { request: { content: { data: unknown } } } }) => {
        open(response.notification.request.content.data);
      },
    );
    return () => sub.remove();
  }, [router]);
}

function RootNavigator() {
  const { ready, token } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useNotificationRouting();

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
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.gold,
        headerTitleStyle: { color: colors.text, fontWeight: "800" },
        headerBackTitle: "Back",
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
      <Stack.Screen name="polls/index" options={{ title: "Polls" }} />
      <Stack.Screen name="polls/[id]" options={{ title: "Poll" }} />
      <Stack.Screen
        name="new-event"
        options={{ title: "New event", presentation: "modal" }}
      />
    </Stack>
  );
}

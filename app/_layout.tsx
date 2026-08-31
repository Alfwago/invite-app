import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider, useAuth } from "@/src/auth/AuthContext";
import { Loading } from "@/src/components/ui";
import { pushSupported } from "@/src/push";
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

    function open(data: unknown) {
      const eventId = (data as { eventId?: number | string } | null)?.eventId;
      if (eventId != null) router.push(`/event/${eventId}`);
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
        headerStyle: {
          backgroundColor: colors.bg,
          borderBottomWidth: 2,
          borderBottomColor: colors.gold,
        },
        headerShadowVisible: false,
        headerTintColor: colors.gold,
        headerTitleStyle: { color: colors.text, fontWeight: "800" },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="event/[id]" options={{ title: "Event" }} />
      <Stack.Screen
        name="new-event"
        options={{ title: "New event", presentation: "modal" }}
      />
    </Stack>
  );
}

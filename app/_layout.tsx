import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";

import { AuthProvider, useAuth } from "@/src/auth/AuthContext";
import { Loading } from "@/src/components/ui";
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
    function open(data: unknown) {
      const eventId = (data as { eventId?: number | string } | null)?.eventId;
      if (eventId != null) router.push(`/event/${eventId}`);
    }

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) open(response.notification.request.content.data);
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      open(response.notification.request.content.data);
    });
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
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
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

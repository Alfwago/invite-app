import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";

import { ApiError } from "@/src/api/client";
import type { HomeNight } from "@/src/api/types";
import { useAuth } from "@/src/auth/AuthContext";
import { EventCard } from "@/src/components/EventCard";
import { Card, ErrorState, Loading } from "@/src/components/ui";
import { useHome } from "@/src/hooks/queries";
import { colors, radius, spacing } from "@/src/theme";

export default function HomeScreen() {
  const { me } = useAuth();
  const query = useHome();

  if (query.isLoading) return <Loading label="Loading…" />;
  if (query.isError || !query.data) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.detail : "Couldn't load the home screen."}
        onRetry={() => query.refetch()}
      />
    );
  }

  const { notices, next_skate, nights, custom_events } = query.data;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={query.refetch}
          tintColor={colors.gold}
        />
      }
    >
      <Text style={styles.greeting}>Hi {me?.first_name || me?.username} 👋</Text>

      {notices.length > 0 ? (
        <View style={styles.noticeBox}>
          {notices.map((n) => (
            <Text key={n.id} style={styles.noticeText}>
              📣 {n.message}
            </Text>
          ))}
        </View>
      ) : null}

      {next_skate ? (
        <View>
          <Text style={styles.sectionLabel}>Your next skate</Text>
          <EventCard event={next_skate} />
        </View>
      ) : (
        <Card>
          <Text style={styles.muted}>You have no upcoming skates.</Text>
        </Card>
      )}

      <Text style={styles.sectionLabel}>Skate groups</Text>
      {nights.map((night) => (
        <NightRow key={night.id} night={night} />
      ))}

      {custom_events.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>Other events</Text>
          {custom_events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

function NightRow({ night }: { night: HomeNight }) {
  if (night.next_event) {
    return (
      <View style={styles.nightBlock}>
        <Text style={styles.nightName}>{night.name}</Text>
        <EventCard event={night.next_event} compact />
      </View>
    );
  }
  return (
    <Link href="/events" asChild>
      <Pressable style={styles.nightEmpty}>
        <Text style={styles.nightName}>{night.name}</Text>
        <Text style={styles.muted}>No event scheduled</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  greeting: { color: colors.text, fontSize: 22, fontWeight: "800" },
  noticeBox: {
    backgroundColor: "#2a2410",
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  noticeText: { color: colors.gold, fontSize: 14, fontWeight: "600" },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },
  nightBlock: { gap: spacing.xs },
  nightName: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  nightEmpty: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 2,
  },
  muted: { color: colors.textMuted },
});

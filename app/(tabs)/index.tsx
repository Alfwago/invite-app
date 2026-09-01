import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApiError } from "@/src/api/client";
import type { HomeNight } from "@/src/api/types";
import { useAuth } from "@/src/auth/AuthContext";
import { AppFooter } from "@/src/components/AppFooter";
import { DirectorToolsCard } from "@/src/components/DirectorToolsCard";
import { EventCard } from "@/src/components/EventCard";
import { VerifyBanner } from "@/src/components/VerifyBanner";
import { Button, Card, ErrorState, Loading } from "@/src/components/ui";
import { useHome, useInbox, usePolls } from "@/src/hooks/queries";
import { colors, font, spacing } from "@/src/theme";

const WORDMARK = require("@/assets/brand/wordmark.png");
const HERO = require("@/assets/brand/hero.jpg");

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { me, signOut } = useAuth();
  const query = useHome();
  const [nightsOpen, setNightsOpen] = useState(false);

  function confirmSignOut() {
    Alert.alert("Log out?", "You'll need to sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => signOut() },
    ]);
  }

  const brand = (
    <View>
      <View style={[styles.brandBar, { paddingTop: insets.top + spacing.sm }]}>
        <Image source={WORDMARK} style={styles.wordmark} resizeMode="contain" />
        <Text style={styles.tagline}>Four Decades{"\n"}One Brotherhood</Text>
      </View>
      <Image source={HERO} style={styles.hero} resizeMode="cover" />
    </View>
  );

  if (query.isLoading) {
    return (
      <View style={styles.screen}>
        {brand}
        <Loading label="Loading…" />
      </View>
    );
  }
  if (query.isError || !query.data) {
    return (
      <View style={styles.screen}>
        {brand}
        <ErrorState
          message={
            query.error instanceof ApiError ? query.error.detail : "Couldn't load the home screen."
          }
          onRetry={() => query.refetch()}
        />
      </View>
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
      {brand}

      <View style={styles.body}>
        <Text style={styles.greeting}>Hi {me?.first_name || me?.username}</Text>

        <VerifyBanner />

        <InboxRow />

        <PollsCard />

        {notices.length > 0 ? (
          <Card accent="public">
            <Text style={styles.noticeLabel}>League notices</Text>
            {notices.map((n) => (
              <Text key={n.id} style={styles.noticeText}>
                {n.message}
              </Text>
            ))}
          </Card>
        ) : null}

        {next_skate ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Your next skate</Text>
            <EventCard event={next_skate} />
          </View>
        ) : (
          <Card>
            <Text style={styles.muted}>You have no upcoming skates.</Text>
          </Card>
        )}

        <View style={styles.section}>
          <Pressable
            onPress={() => setNightsOpen((o) => !o)}
            style={styles.collapseHeader}
            hitSlop={8}
          >
            <Text style={[styles.sectionLabel, styles.noMargin]}>Night status</Text>
            <Ionicons
              name={nightsOpen ? "chevron-down" : "chevron-forward"}
              size={16}
              color={colors.textMuted}
            />
          </Pressable>
          {nightsOpen ? (
            <Card>
              {nights.map((night, i) => (
                <NightRow key={night.id} night={night} last={i === nights.length - 1} />
              ))}
            </Card>
          ) : null}
        </View>

        {custom_events.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Other events</Text>
            {custom_events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </>
        ) : null}

        <DirectorToolsCard />

        <Button label="Sign out" variant="secondary" onPress={confirmSignOut} style={styles.signOut} />

        <AppFooter />
      </View>
    </ScrollView>
  );
}

function InboxRow() {
  const router = useRouter();
  const inbox = useInbox();
  const unread = inbox.data?.unread_total ?? 0;
  return (
    <Card>
      <Pressable style={styles.inboxRow} onPress={() => router.push("/inbox" as never)}>
        <Ionicons name="mail-outline" size={20} color={colors.gold} />
        <Text style={styles.inboxLabel}>Inbox</Text>
        {unread > 0 ? (
          <View style={styles.inboxBadge}>
            <Text style={styles.inboxBadgeText}>{unread > 9 ? "9+" : unread}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    </Card>
  );
}

function PollsCard() {
  const router = useRouter();
  const polls = usePolls();
  const open = (polls.data ?? []).filter((p) => !p.all_answered);
  if (open.length === 0) return null;
  return (
    <Card accent="public">
      <Text style={styles.noticeLabel}>
        {open.length === 1 ? "Poll" : "Polls"} to answer
      </Text>
      {open.map((p) => (
        <Pressable
          key={p.id}
          style={styles.pollRow}
          onPress={() => router.push(`/polls/${p.id}` as never)}
        >
          <Text style={styles.pollTitle}>{p.title}</Text>
          <Text style={styles.pollMeta}>{p.answered_q}/{p.total_q}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      ))}
    </Card>
  );
}

function NightRow({ night, last }: { night: HomeNight; last?: boolean }) {
  if (night.next_event) {
    return (
      <View style={[styles.nightBlock, !last && styles.nightRowBorder]}>
        <Text style={styles.nightName}>{night.name}</Text>
        <EventCard event={night.next_event} compact />
      </View>
    );
  }
  return (
    <Link href="/events" asChild>
      <Pressable style={[styles.nightBlock, !last && styles.nightRowBorder]}>
        <Text style={styles.nightName}>{night.name}</Text>
        <Text style={styles.muted}>No event scheduled</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing.xl },
  brandBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.bg,
  },
  wordmark: { width: 150, height: 42 },
  tagline: {
    color: colors.gold,
    fontSize: font.xs,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    lineHeight: 15,
  },
  hero: {
    width: "100%",
    height: 104,
    borderTopWidth: 3,
    borderTopColor: colors.gold,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  body: { padding: spacing.lg, gap: spacing.md },
  greeting: { color: colors.text, fontSize: font.lg, fontWeight: "800" },
  section: { gap: spacing.sm },
  noticeLabel: {
    color: colors.gold,
    fontSize: font.xs,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  noticeText: { color: colors.text, fontSize: font.sm, lineHeight: 20 },
  pollRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 4 },
  pollTitle: { color: colors.text, fontSize: font.sm, fontWeight: "600", flex: 1 },
  pollMeta: { color: colors.textMuted, fontSize: font.xs, fontVariant: ["tabular-nums"] },
  inboxRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  inboxLabel: { color: colors.text, fontSize: font.base, fontWeight: "700", flex: 1 },
  inboxBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  inboxBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: font.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  nightBlock: { gap: spacing.xs, paddingVertical: spacing.sm },
  nightRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  nightName: { color: colors.textMuted, fontSize: font.sm, fontWeight: "600" },
  muted: { color: colors.textMuted },
  collapseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  noMargin: { marginTop: 0 },
  signOut: { marginTop: spacing.lg },
});

import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";

import { ApiError } from "@/src/api/client";
import * as api from "@/src/api/endpoints";
import { useAuth } from "@/src/auth/AuthContext";
import { Button, Card } from "@/src/components/ui";
import { PENDING_COPY, pendingReason } from "@/src/pendingAccount";
import { colors, font, spacing } from "@/src/theme";

/**
 * Pending account (app 1.8.1 / server 0.39.2, owner 2026-10-22): until a
 * director approves the account and its email is verified, this is all it
 * gets — its profile, resend the verification email, delete the account,
 * sign out. The root navigator sends a pending account here
 * (src/pendingAccount.ts) and back to Home once it's approved.
 */
export default function PendingScreen() {
  const router = useRouter();
  const { me, refreshMe, signOut } = useAuth();
  const reason = pendingReason(me) ?? "approval";
  const copy = PENDING_COPY[reason];
  const [checking, setChecking] = useState(false);

  // Re-check when the screen comes back into view (e.g. after the player
  // taps the verify link in their email and returns to the app).
  useFocusEffect(
    useCallback(() => {
      void refreshMe().catch(() => {});
    }, [refreshMe]),
  );

  const resend = useMutation({
    mutationFn: () => api.resendVerification(),
    onSuccess: (r) => {
      Alert.alert(
        r.already_verified ? "Already verified" : "Check your email",
        r.already_verified ? "Your email is already verified." : "We sent a new verification link.",
      );
      void refreshMe().catch(() => {});
    },
    onError: (e) => Alert.alert("Couldn't send", e instanceof ApiError ? e.detail : "Try again later."),
  });

  async function checkAgain() {
    setChecking(true);
    try {
      await refreshMe();
    } catch {
      // the navigator handles a signed-out token
    } finally {
      setChecking(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card accent="public">
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>
        {me?.email ? <Text style={styles.meta}>Email: {me.email}</Text> : null}
        <Button label="Check again" onPress={checkAgain} loading={checking} />
      </Card>

      <Card>
        <Text style={styles.heading}>While you wait</Text>
        <View style={styles.actions}>
          <Button label="Your profile" variant="secondary" onPress={() => router.push("/(tabs)/profile")} />
          {me && !me.email_verified ? (
            <Button
              label="Resend verification email"
              variant="secondary"
              onPress={() => resend.mutate()}
              loading={resend.isPending}
            />
          ) : null}
          <Button label="Delete account" variant="secondary" onPress={() => router.push("/delete-account")} />
          <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  title: { color: colors.gold, fontSize: font.lg, fontWeight: "800" },
  heading: { color: colors.gold, fontSize: font.md, fontWeight: "800" },
  body: { color: colors.text, fontSize: font.base, lineHeight: 22 },
  meta: { color: colors.textMuted, fontSize: font.sm },
  actions: { gap: spacing.sm },
});

import { useCallback } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useMutation } from "@tanstack/react-query";

import { ApiError } from "@/src/api/client";
import * as api from "@/src/api/endpoints";
import { useAuth } from "@/src/auth/AuthContext";
import { Button } from "@/src/components/ui";
import { colors, font, radius, spacing } from "@/src/theme";

/**
 * "Verify your email" call-to-action. Renders nothing when the signed-in user
 * is verified or is a director (directors are auto-verified server-side).
 */
export function VerifyBanner({ compact }: { compact?: boolean }) {
  const { me, refreshMe } = useAuth();
  const unverified = !!me && !me.email_verified && !me.is_director;

  // Re-check /me/ when the host screen regains focus, so the banner clears
  // itself once the user taps the verify link in their browser.
  useFocusEffect(
    useCallback(() => {
      if (unverified) refreshMe();
    }, [unverified, refreshMe]),
  );

  const resend = useMutation({
    mutationFn: () => api.resendVerification(),
    onSuccess: (r) => {
      Alert.alert(
        r.already_verified ? "Already verified" : "Check your email",
        r.already_verified
          ? "Your email is already verified."
          : "We sent a new verification link. Open it, then come back — the app updates on its own.",
      );
      refreshMe();
    },
    onError: (e) =>
      Alert.alert("Couldn't send", e instanceof ApiError ? e.detail : "Try again later."),
  });

  if (!unverified) return null;

  return (
    <View style={[styles.box, compact && styles.compact]}>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.body}>
        Your email address isn&apos;t verified yet — you can&apos;t RSVP to skates until it is.
      </Text>
      <Button
        label="Resend verification email"
        variant="secondary"
        onPress={() => resend.mutate()}
        loading={resend.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.amberDim,
    borderColor: colors.amber,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  compact: { padding: spacing.md, borderRadius: radius.md },
  title: { color: colors.amber, fontSize: font.md, fontWeight: "800" },
  body: { color: colors.text, fontSize: font.sm, lineHeight: 19 },
});

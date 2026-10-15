import { Alert, StyleSheet, Text, View } from "react-native";

import { ApiError } from "@/src/api/client";
import type { PromotionInfo } from "@/src/api/types";
import { useToast } from "@/src/components/Toast";
import { Button, Card } from "@/src/components/ui";
import { useAnswerPromotion } from "@/src/hooks/queries";
import { CONFIRM_LABEL, DECLINE_LABEL } from "@/src/promotion";
import { colors, font, spacing } from "@/src/theme";

/**
 * "You've been promoted to the roster for Thu Oct 16 · 8:30 PM. Can you make
 * it?" with Confirm / Can't make it (server 0.36.0+, owner 2026-10-15). On
 * the event screen it REPLACES the RSVP buttons until they answer; Home shows
 * the same card. Can't make it asks once — it gives the spot away.
 */
export function PromotionCard({
  eventId,
  promotion,
  eventName,
}: {
  eventId: number | string;
  promotion: PromotionInfo;
  /** Shown on Home, where the card isn't inside the event. */
  eventName?: string;
}) {
  const answer = useAnswerPromotion(eventId);
  const toast = useToast();
  // The server's wording wins; the app's constants are the fallback.
  const confirmLabel = promotion.confirm_label || CONFIRM_LABEL;
  const declineLabel = promotion.decline_label || DECLINE_LABEL;

  async function send(action: "confirm" | "decline") {
    try {
      await answer.mutateAsync(action);
      toast.show(
        action === "confirm" ? "You're confirmed. See you there!" : "Got it — the directors have been told.",
        "success",
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        toast.show("Already answered.");
        return;
      }
      Alert.alert("Couldn't send that", e instanceof ApiError ? e.detail : "Check your connection and try again.");
    }
  }

  function decline() {
    Alert.alert(
      "Give up your spot?",
      "It goes to the next player on the waitlist. Saying you can't make it is never a late drop.",
      [
        { text: "Keep my spot", style: "cancel" },
        { text: declineLabel, style: "destructive", onPress: () => void send("decline") },
      ],
    );
  }

  const busy = answer.isPending;
  return (
    <Card style={styles.card}>
      <Text style={styles.kicker}>You&apos;re on the roster</Text>
      {eventName ? <Text style={styles.event}>{eventName}</Text> : null}
      <Text style={styles.prompt}>{promotion.prompt}</Text>
      <Text style={styles.hint}>Your spot is held until you answer.</Text>
      <View style={styles.actions}>
        <Button
          label={confirmLabel}
          onPress={() => void send("confirm")}
          loading={busy && answer.variables === "confirm"}
          disabled={busy}
          style={styles.btn}
        />
        <Button
          label={declineLabel}
          variant="secondary"
          onPress={decline}
          loading={busy && answer.variables === "decline"}
          disabled={busy}
          style={styles.btn}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: colors.gold, borderWidth: 2, gap: spacing.sm },
  kicker: {
    color: colors.gold,
    fontSize: font.xs,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  event: { color: colors.text, fontSize: font.base, fontWeight: "700" },
  prompt: { color: colors.text, fontSize: font.base, lineHeight: 22 },
  hint: { color: colors.textMuted, fontSize: font.xs },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  btn: { flex: 1, minHeight: 48 },
});

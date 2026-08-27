import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";

import type { EventDetail } from "@/src/api/types";
import { ApiError } from "@/src/api/client";
import { Button, Card } from "@/src/components/ui";
import { usePatchEvent, useSendBatch, useSendInvites } from "@/src/hooks/queries";
import { colors, spacing } from "@/src/theme";

export function DirectorPanel({ event }: { event: EventDetail }) {
  const [message, setMessage] = useState(event.director_message ?? "");
  const patch = usePatchEvent(event.id);
  const sendInvites = useSendInvites(event.id);
  const sendBatch = useSendBatch(event.id);

  const dirty = message.trim() !== (event.director_message ?? "").trim();

  function saveMessage() {
    patch.mutate(
      { director_message: message.trim() },
      { onError: (e) => Alert.alert("Couldn't save", errText(e)) },
    );
  }

  function confirmSendInvites() {
    Alert.alert(
      "Send invites?",
      "This emails the first batch of invites for this event now.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: () =>
            sendInvites.mutate(dirty ? message.trim() : undefined, {
              onSuccess: (r) =>
                Alert.alert("Invites sent", `${r.notified} notified, ${r.created} new records.`),
              onError: (e) => Alert.alert("Send failed", errText(e)),
            }),
        },
      ],
    );
  }

  function confirmSendBatch() {
    Alert.alert("Send batch 2?", "Emails everyone on the batch-2 list now.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send",
        onPress: () =>
          sendBatch.mutate(undefined, {
            onSuccess: (r) => Alert.alert("Batch 2 sent", `${r.notified} notified.`),
            onError: (e) => Alert.alert("Send failed", errText(e)),
          }),
      },
    ]);
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.heading}>Director</Text>

      <Text style={styles.label}>Director message</Text>
      <TextInput
        style={styles.textarea}
        value={message}
        onChangeText={setMessage}
        placeholder="Add a note for the invite…"
        placeholderTextColor={colors.textMuted}
        multiline
      />
      <Button
        label={dirty ? "Save message" : "Message saved"}
        variant="secondary"
        onPress={saveMessage}
        disabled={!dirty}
        loading={patch.isPending}
      />

      <View style={styles.divider} />

      <Text style={styles.status}>
        {event.invites_sent_at
          ? `Invites sent ${new Date(event.invites_sent_at).toLocaleString()}`
          : "Invites not sent yet."}
      </Text>
      <Button label="Send invites" onPress={confirmSendInvites} loading={sendInvites.isPending} />
      <Button
        label="Send batch 2"
        variant="secondary"
        onPress={confirmSendBatch}
        loading={sendBatch.isPending}
      />
    </Card>
  );
}

function errText(e: unknown): string {
  return e instanceof ApiError ? e.detail : "Something went wrong.";
}

const styles = StyleSheet.create({
  card: { borderColor: colors.gold },
  heading: { color: colors.gold, fontSize: 16, fontWeight: "800" },
  label: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase" },
  textarea: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: "top",
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  status: { color: colors.textMuted, fontSize: 13 },
});

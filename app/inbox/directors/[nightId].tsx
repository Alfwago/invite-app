import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ApiError } from "@/src/api/client";
import { ErrorState, Loading } from "@/src/components/ui";
import { useMessageNightDirectors, useNightDirectors } from "@/src/hooks/queries";
import { colors, font, radius, spacing } from "@/src/theme";

export default function MessageDirectorsScreen() {
  const { nightId } = useLocalSearchParams<{ nightId: string }>();
  const id = Number(nightId);
  const router = useRouter();
  const query = useNightDirectors(Number.isNaN(id) ? null : id);
  const send = useMessageNightDirectors(id);
  const [draft, setDraft] = useState("");

  if (query.isLoading) return <Loading label="Loading…" />;
  if (query.isError || !query.data) {
    return (
      <ErrorState
        message={
          query.error instanceof ApiError ? query.error.detail : "Couldn't load."
        }
        onRetry={() => query.refetch()}
      />
    );
  }

  const { night_name, directors } = query.data;
  const names = directors.map((d) => d.name).join(" and ") || "the directors";

  async function submit() {
    const body = draft.trim();
    if (!body) return;
    try {
      const res = await send.mutateAsync(body);
      setDraft("");
      const to = res.messaged.map((d) => d.name).join(" and ");
      Alert.alert("Sent", `Your message went to ${to}.`, [
        {
          text: "OK",
          onPress: () =>
            res.messaged.length === 1
              ? router.replace(`/inbox/${res.messaged[0].id}` as never)
              : router.replace("/inbox" as never),
        },
      ]);
    } catch {
      // error shown below
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: `Contact the ${night_name} directors` }} />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.body}>
          <Text style={styles.blurb}>
            {directors.length > 1
              ? `This sends a separate private message to ${names}, the directors for ${night_name}. They each reply in their own thread — it isn't a group chat.`
              : `This sends a private message to ${names}, the director for ${night_name}.`}
          </Text>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask the directors a question…"
            placeholderTextColor={colors.textMuted}
            multiline
            autoFocus
          />
          {send.isError ? (
            <Text style={styles.error}>
              {send.error instanceof ApiError ? send.error.detail : "Couldn't send."}
            </Text>
          ) : null}
          <Pressable
            style={[styles.sendBtn, (!draft.trim() || send.isPending) && styles.sendOff]}
            disabled={!draft.trim() || send.isPending}
            onPress={submit}
          >
            <Ionicons name="arrow-up" size={18} color={colors.goldText} />
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg, gap: spacing.md },
  blurb: { color: colors.textMuted, fontSize: font.sm, lineHeight: 20 },
  input: {
    minHeight: 120,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 15,
    textAlignVertical: "top",
  },
  error: { color: colors.red, fontSize: font.xs },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  sendOff: { opacity: 0.4 },
  sendText: { color: colors.goldText, fontWeight: "700", fontSize: 15 },
});

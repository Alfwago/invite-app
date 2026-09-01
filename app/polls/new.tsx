import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ApiError } from "@/src/api/client";
import { Button, Card } from "@/src/components/ui";
import { usePollAdminMutations } from "@/src/hooks/queries";
import { colors, font, radius, spacing } from "@/src/theme";

type Q = { text: string; choices: string[] };

export default function NewPollScreen() {
  const router = useRouter();
  const { create } = usePollAdminMutations();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Q[]>([{ text: "", choices: ["", ""] }]);

  function setQ(i: number, patch: Partial<Q>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }
  function setChoice(qi: number, ci: number, val: string) {
    setQuestions((qs) =>
      qs.map((q, idx) =>
        idx === qi ? { ...q, choices: q.choices.map((c, j) => (j === ci ? val : c)) } : q,
      ),
    );
  }

  const valid =
    title.trim() &&
    questions.every(
      (q) => q.text.trim() && q.choices.filter((c) => c.trim()).length >= 2,
    );

  async function submit() {
    try {
      await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        questions: questions.map((q) => ({
          text: q.text.trim(),
          choices: q.choices.map((c) => c.trim()).filter(Boolean),
        })),
      });
      router.back();
    } catch (e) {
      Alert.alert("Couldn't create", e instanceof ApiError ? e.detail : "Try again.");
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "New poll", presentation: "modal" }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Jersey colours"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="A line of context"
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </Card>

        {questions.map((q, qi) => (
          <Card key={qi}>
            <View style={styles.qHead}>
              <Text style={styles.label}>Question {qi + 1}</Text>
              {questions.length > 1 ? (
                <Pressable onPress={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))} hitSlop={8}>
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
            <TextInput
              style={styles.input}
              value={q.text}
              onChangeText={(t) => setQ(qi, { text: t })}
              placeholder="What are you asking?"
              placeholderTextColor={colors.textMuted}
            />
            {q.choices.map((c, ci) => (
              <View key={ci} style={styles.choiceRow}>
                <TextInput
                  style={[styles.input, styles.grow]}
                  value={c}
                  onChangeText={(t) => setChoice(qi, ci, t)}
                  placeholder={`Choice ${ci + 1}`}
                  placeholderTextColor={colors.textMuted}
                />
                {q.choices.length > 2 ? (
                  <Pressable
                    onPress={() => setQ(qi, { choices: q.choices.filter((_, j) => j !== ci) })}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={18} color={colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>
            ))}
            <Pressable onPress={() => setQ(qi, { choices: [...q.choices, ""] })} style={styles.addChoice}>
              <Text style={styles.addChoiceText}>+ Add choice</Text>
            </Pressable>
          </Card>
        ))}

        <Button
          label="+ Add question"
          variant="secondary"
          onPress={() => setQuestions((qs) => [...qs, { text: "", choices: ["", ""] }])}
        />
        <Button label="Create poll" onPress={submit} loading={create.isPending} disabled={!valid} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  label: {
    color: colors.textMuted,
    fontSize: font.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    color: colors.text,
    padding: spacing.md,
    fontSize: 15,
  },
  multiline: { minHeight: 56 },
  grow: { flex: 1 },
  qHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  remove: { color: colors.red, fontSize: font.xs, fontWeight: "700" },
  choiceRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  addChoice: { paddingVertical: spacing.xs },
  addChoiceText: { color: colors.gold, fontSize: font.sm, fontWeight: "700" },
});

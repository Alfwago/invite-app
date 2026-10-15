import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ApiError } from "@/src/api/client";
import { Tap } from "@/src/components/Tap";
import { useToast } from "@/src/components/Toast";
import { Button, Card, Segmented } from "@/src/components/ui";
import { useManagePolls, usePollAdminMutations } from "@/src/hooks/queries";
import {
  type Audience,
  audienceValid,
  cleanPicked,
  newPollBody,
  notifiedText,
  supportsPollGroups,
} from "@/src/polls";
import { colors, font, radius, spacing } from "@/src/theme";

type Q = { text: string; choices: string[] };

export default function NewPollScreen() {
  const router = useRouter();
  const { create } = usePollAdminMutations();
  const toast = useToast();
  // The groups this director can pick (server 0.36.0+). An older server
  // sends none: no picker, no Notify switch, the poll is for everyone.
  const manage = useManagePolls();
  const groupsSupported = supportsPollGroups(manage.data);
  const pickable = manage.data?.pickable_nights ?? [];
  const [audience, setAudience] = useState<Audience>("everyone");
  const [picked, setPicked] = useState<number[]>([]);
  const [notify, setNotify] = useState(true);
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

  const groupIds = cleanPicked(picked, pickable);
  const valid =
    title.trim() &&
    (!groupsSupported || audienceValid(audience, groupIds)) &&
    questions.every(
      (q) => q.text.trim() && q.choices.filter((c) => c.trim()).length >= 2,
    );

  function toggleGroup(id: number) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function submit() {
    try {
      const res = await create.mutateAsync(
        newPollBody(
          {
            title: title.trim(),
            description: description.trim() || undefined,
            questions: questions.map((q) => ({
              text: q.text.trim(),
              choices: q.choices.map((c) => c.trim()).filter(Boolean),
            })),
          },
          { groupsSupported, audience, picked: groupIds, notify },
        ),
      );
      const sent = notifiedText(res.notified);
      toast.show(sent ? `Poll created. ${sent}` : "Poll created.", "success");
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

        {groupsSupported ? (
          <Card>
            <Text style={styles.label}>Who can vote</Text>
            <Segmented<Audience>
              label="Who can vote"
              value={audience}
              onChange={setAudience}
              options={[
                { key: "everyone", label: "Everyone" },
                {
                  key: "groups",
                  label: "Skate groups",
                  disabled: pickable.length === 0,
                  hint: pickable.length === 0 ? "You don't run a skate group." : undefined,
                },
              ]}
            />
            {audience === "groups" ? (
              <View style={styles.groups}>
                {pickable.map((n) => {
                  const on = groupIds.includes(n.id);
                  return (
                    <Tap
                      key={n.id}
                      feedback="row"
                      onPress={() => toggleGroup(n.id)}
                      style={[styles.groupRow, on && styles.groupRowOn]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={n.name}
                    >
                      <Ionicons
                        name={on ? "checkbox" : "square-outline"}
                        size={20}
                        color={on ? colors.gold : colors.textMuted}
                      />
                      <Text style={[styles.groupText, on && styles.groupTextOn]}>{n.name}</Text>
                    </Tap>
                  );
                })}
                <Text style={styles.hint}>
                  {groupIds.length === 0
                    ? "Pick at least one group."
                    : "Only members of these groups can see and answer it."}
                </Text>
              </View>
            ) : (
              <Text style={styles.hint}>Every player can see and answer it.</Text>
            )}
            <View style={styles.notifyRow}>
              <View style={styles.grow}>
                <Text style={styles.notifyLabel}>Notify players</Text>
                <Text style={styles.hint}>Email, a phone notification and an OBH Notifications message.</Text>
              </View>
              <View style={styles.switchBox}>
                <Switch
                  value={notify}
                  onValueChange={setNotify}
                  trackColor={{ true: colors.gold, false: colors.border }}
                  thumbColor="#fff"
                  accessibilityLabel="Notify players"
                />
              </View>
            </View>
          </Card>
        ) : null}

        {questions.map((q, qi) => (
          <Card key={qi}>
            <View style={styles.qHead}>
              <Text style={styles.label}>Question {qi + 1}</Text>
              {questions.length > 1 ? (
                <Tap feedback="icon" onPress={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))} hitSlop={8}>
                  <Text style={styles.remove}>Remove</Text>
                </Tap>
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
                  <Tap
                    feedback="icon"
                    onPress={() => setQ(qi, { choices: q.choices.filter((_, j) => j !== ci) })}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={18} color={colors.textMuted} />
                  </Tap>
                ) : null}
              </View>
            ))}
            <Tap onPress={() => setQ(qi, { choices: [...q.choices, ""] })} style={styles.addChoice}>
              <Text style={styles.addChoiceText}>+ Add choice</Text>
            </Tap>
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
  groups: { gap: spacing.xs },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardRaised,
  },
  groupRowOn: { borderColor: colors.gold, backgroundColor: colors.goldDim },
  groupText: { color: colors.text, fontSize: font.sm, flex: 1 },
  groupTextOn: { color: colors.gold, fontWeight: "700" },
  hint: { color: colors.textMuted, fontSize: font.xs },
  notifyRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  notifyLabel: { color: colors.text, fontSize: font.sm, fontWeight: "700" },
  // iOS draws a Switch at the top of a taller row unless it's in its own box.
  switchBox: { height: 31, justifyContent: "center" },
});
